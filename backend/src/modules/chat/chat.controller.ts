import { Response } from 'express';
import { AuthenticatedRequest } from '../../types';
import { ChatService } from './chat.service';
import { User } from '../../models';
import { sendSuccess, sendError } from '../../utils/response';

export class ChatController {
  /**
   * Retrieves conversations visible to the authenticated user.
   */
  static async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const conversations = await ChatService.getVisibleConversations(userId, role);
      sendSuccess(res, conversations, 'Visible conversations retrieved successfully');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve conversations', 500);
    }
  }

  /**
   * Retrieves messages for an authorized conversation.
   */
  static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const result = await ChatService.getMessages(id, userId, role, page, limit);
      sendSuccess(res, result.messages, 'Messages retrieved successfully', 200, {
        page: result.page,
        limit,
        total: result.total,
      });
    } catch (err: any) {
      if (err.message.startsWith('FORBIDDEN')) {
        sendError(res, err.message, 403);
        return;
      }
      sendError(res, err.message || 'Failed to retrieve messages', 500);
    }
  }

  /**
   * Posts an end-to-end encrypted message.
   */
  static async postMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { ciphertext, nonce, keyVersion, replyTo, attachments } = req.body;

      if (!ciphertext || !nonce) {
        sendError(res, 'Ciphertext and cryptographic nonce are required.', 400);
        return;
      }

      const message = await ChatService.postMessage({
        conversationId: id,
        senderId: userId,
        senderRole: role,
        ciphertext,
        nonce,
        keyVersion,
        replyTo,
        attachments,
      });

      sendSuccess(res, message, 'Encrypted message posted successfully', 201);
    } catch (err: any) {
      if (err.message.startsWith('FORBIDDEN')) {
        sendError(res, err.message, 403);
        return;
      }
      if (err.message.startsWith('INVALID')) {
        sendError(res, err.message, 400);
        return;
      }
      sendError(res, err.message || 'Failed to post message', 500);
    }
  }

  /**
   * Uploads an encrypted file attachment into private storage.
   */
  static async uploadAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const file = (req as any).file;
      const { fileNonce, originalFileNameCiphertext, mimeTypeCiphertext } = req.body;

      if (!file) {
        sendError(res, 'No file attachment provided in form data.', 400);
        return;
      }

      if (!fileNonce) {
        sendError(res, 'Cryptographic fileNonce required for encrypted attachment.', 400);
        return;
      }

      const attachmentInfo = await ChatService.saveEncryptedAttachment({
        conversationId: id,
        userId,
        role,
        fileBuffer: file.buffer,
        fileNonce,
        originalFileNameCiphertext,
        mimeTypeCiphertext,
      });

      sendSuccess(res, attachmentInfo, 'Encrypted attachment uploaded successfully', 201);
    } catch (err: any) {
      if (err.message.startsWith('FORBIDDEN')) {
        sendError(res, err.message, 403);
        return;
      }
      if (err.message.startsWith('FILE_TOO_LARGE') || err.message.startsWith('INVALID')) {
        sendError(res, err.message, 400);
        return;
      }
      sendError(res, err.message || 'Failed to upload attachment', 500);
    }
  }

  /**
   * Downloads an encrypted attachment from private storage.
   */
  static async downloadAttachment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id, attachmentId } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;

      const { filePath, originalFileNameCiphertext } = await ChatService.getEncryptedAttachmentStream({
        conversationId: id,
        attachmentId,
        userId,
        role,
      });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="encrypted_${attachmentId}.bin"`);
      if (originalFileNameCiphertext) {
        res.setHeader('X-Encrypted-Filename', originalFileNameCiphertext);
      }

      res.sendFile(filePath);
    } catch (err: any) {
      if (err.message.startsWith('FORBIDDEN')) {
        sendError(res, err.message, 403);
        return;
      }
      sendError(res, err.message || 'Failed to download attachment', 404);
    }
  }

  /**
   * Registers the caller's E2EE public key.
   */
  static async registerPublicKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { publicKey } = req.body;

      if (!publicKey) {
        sendError(res, 'Public key is required', 400);
        return;
      }

      await ChatService.registerUserPublicKey(userId, publicKey);
      sendSuccess(res, undefined, 'E2EE public key registered successfully');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to register public key', 400);
    }
  }

  /**
   * Retrieves a user's E2EE public key for key exchange.
   */
  static async getUserPublicKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await User.findById(userId).select('e2eePublicKey identifier role status').lean();

      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      sendSuccess(res, {
        userId: user._id,
        identifier: user.identifier,
        e2eePublicKey: user.e2eePublicKey || null,
      }, 'User public key retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to fetch public key', 500);
    }
  }

  /**
   * Stores an encrypted group key envelope.
   */
  static async storeGroupKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { targetUserId, encryptedKey, nonce, keyVersion } = req.body;

      if (!targetUserId || !encryptedKey || !nonce) {
        sendError(res, 'Target user ID, encrypted key, and nonce are required.', 400);
        return;
      }

      await ChatService.storeEncryptedGroupKey({
        conversationId: id,
        userId: targetUserId,
        encryptedKey,
        nonce,
        keyVersion: keyVersion || 1,
      });

      sendSuccess(res, undefined, 'Encrypted group key envelope stored successfully');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to store group key', 500);
    }
  }

  /**
   * Retrieves caller's encrypted group key envelope.
   */
  static async getGroupKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const groupKey = await ChatService.getGroupKeyForUser(id, userId);
      sendSuccess(res, groupKey, 'Group key retrieved');
    } catch (err: any) {
      sendError(res, err.message || 'Failed to retrieve group key', 500);
    }
  }
}
