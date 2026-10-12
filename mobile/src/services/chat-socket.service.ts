import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { api } from './api';

const SOCKET_SERVER_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  (process.env.EXPO_PUBLIC_API_URL
    ? process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '')
    : Platform.OS === 'android'
    ? 'http://10.0.2.2:5000'
    : 'http://localhost:5000');

class ChatSocketService {
  private socket: Socket | null = null;
  private messageHandlers: Array<(message: any) => void> = [];
  private typingHandlers: Array<(data: any) => void> = [];

  public connect(): void {
    const token = api.getAccessToken();
    if (!token) return;

    if (this.socket && this.socket.connected) return;

    this.socket = io(SOCKET_SERVER_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      // Socket connected
    });

    this.socket.on('chat:message', (message: any) => {
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.socket.on('chat:typing', (data: any) => {
      this.typingHandlers.forEach((handler) => handler(data));
    });

    this.socket.on('disconnect', () => {
      // Socket disconnected
    });
  }

  public joinConversation(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('join_conversation', { conversationId });
    }
  }

  public leaveConversation(conversationId: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave_conversation', { conversationId });
    }
  }

  public sendEncryptedMessage(data: {
    conversationId: string;
    ciphertext: string;
    nonce: string;
    keyVersion?: number;
    replyTo?: string;
    attachments?: any[];
  }): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('send_message', data);
    }
  }

  public emitTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing', { conversationId, isTyping });
    }
  }

  public onMessage(handler: (message: any) => void): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  public onTyping(handler: (data: any) => void): () => void {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter((h) => h !== handler);
    };
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const chatSocketService = new ChatSocketService();
