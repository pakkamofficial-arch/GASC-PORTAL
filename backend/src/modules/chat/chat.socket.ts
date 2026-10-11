import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../../utils/jwt';
import { User } from '../../models/User';
import { ChatService } from './chat.service';
import { config } from '../../config';

let ioInstance: SocketIOServer | null = null;

export function setupChatSocket(server: HttpServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    maxHttpBufferSize: 1e7, // 10MB
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const authHeader =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!authHeader) {
        return next(new Error('Authentication error: Missing token'));
      }

      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).lean();

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('Authentication error: Account is inactive or does not exist'));
      }

      socket.data.user = {
        userId: user._id.toString(),
        role: user.role,
        identifier: user.identifier,
      };

      next();
    } catch {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join user-specific notification room
    socket.join(`user:${user.userId}`);

    // Join conversation room with strict server-side authorization check
    socket.on('join_conversation', async (data: { conversationId: string }, callback?: (res: any) => void) => {
      try {
        const { conversationId } = data;
        const access = await ChatService.canUserAccessConversation(conversationId, user.userId, user.role);

        if (!access.allowed) {
          if (callback) callback({ success: false, error: access.reason || 'Forbidden' });
          socket.emit('chat:error', { message: access.reason || 'Forbidden: Unauthorized access to conversation' });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        if (callback) callback({ success: true, conversationId });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (data: { conversationId: string }) => {
      if (data?.conversationId) {
        socket.leave(`conversation:${data.conversationId}`);
      }
    });

    // Send encrypted message via WebSocket
    socket.on('send_message', async (data: any, callback?: (res: any) => void) => {
      try {
        const { conversationId, ciphertext, nonce, keyVersion, replyTo, attachments } = data;

        const message = await ChatService.postMessage({
          conversationId,
          senderId: user.userId,
          senderRole: user.role,
          ciphertext,
          nonce,
          keyVersion,
          replyTo,
          attachments,
        });

        // Broadcast to all sockets subscribed to this conversation room
        io.to(`conversation:${conversationId}`).emit('chat:message', message);

        if (callback) callback({ success: true, message });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
        socket.emit('chat:error', { message: err.message });
      }
    });

    // Typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (data?.conversationId) {
        socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId: user.userId,
          identifier: user.identifier,
          isTyping: data.isTyping,
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean socket disconnect handled automatically
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return ioInstance;
}
