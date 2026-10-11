import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Conversation, IConversation, ChatMessage, IChatMessage, ConversationType } from '../../models/Chat';
import { User, Student, Faculty, CollegeClass, Department } from '../../models';
import { isValidNonce, isValidPublicKey, isValidBase64 } from '../../services/e2ee.service';
import { config } from '../../config';

const ATTACHMENTS_DIR = path.resolve(__dirname, '../../../storage/chat-attachments');

// Ensure attachments directory exists safely outside static public directory
if (!fs.existsSync(ATTACHMENTS_DIR)) {
  fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
}

export class ChatService {
  /**
   * Initializes default institutional groups if they do not exist:
   * 1. CS 3rd Year Group
   * 2. Faculty Communication Group
   * 3. Whole College Community
   * 4. Principal & Administration Restricted Group
   */
  static async ensureDefaultGroups(): Promise<void> {
    // 1. Whole College Community Group
    let collegeGroup = await Conversation.findOne({ type: 'WHOLE_COLLEGE' });
    if (!collegeGroup) {
      collegeGroup = await Conversation.create({
        type: 'WHOLE_COLLEGE',
        name: 'Whole College Connect',
        description: 'Official institutional communication group for students, faculty, and administration.',
        isAnnouncementOnly: false,
        keyVersion: 1,
        members: [],
      });
    }

    // 2. Faculty Communication Group
    let facultyGroup = await Conversation.findOne({ type: 'FACULTY_ONLY' });
    if (!facultyGroup) {
      facultyGroup = await Conversation.create({
        type: 'FACULTY_ONLY',
        name: 'Faculty Communication Group',
        description: 'Confidential channel strictly restricted to verified college faculty and academic leadership.',
        keyVersion: 1,
        members: [],
      });
    }

    // 3. Admin & Principal Restricted Group
    let principalGroup = await Conversation.findOne({
      type: { $in: ['PRINCIPAL_RESTRICTED', 'ADMIN_RESTRICTED'] },
    });
    if (!principalGroup) {
      principalGroup = await Conversation.create({
        type: 'ADMIN_RESTRICTED',
        name: 'Admin & Principal Executive Restricted',
        description: 'Confidential executive channel restricted exclusively to the Admin / Principal and explicitly authorized leadership.',
        keyVersion: 1,
        members: [],
      });
    }

    // 4. CS 3rd Year Group
    let csClass = await CollegeClass.findOne({ year: 3, section: 'A' }).populate('departmentId');
    if (!csClass) {
      csClass = await CollegeClass.findOne({ year: 3 });
    }

    let cs3Group = await Conversation.findOne({
      type: 'CLASS_GROUP',
      name: { $regex: /Computer Science.*3/i },
    });

    if (!cs3Group) {
      cs3Group = await Conversation.create({
        type: 'CLASS_GROUP',
        name: 'B.Sc. Computer Science — 3rd Year',
        description: 'Official class communications for 3rd Year Computer Science students and assigned faculty.',
        classId: csClass?._id,
        departmentId: csClass?.departmentId as any,
        year: 3,
        keyVersion: 1,
        members: [],
      });
    }
  }

  /**
   * Verifies if a user has authorized access to a specific conversation.
   * Enforces strict collegiate role boundaries.
   */
  static async canUserAccessConversation(
    conversationId: string | mongoose.Types.ObjectId,
    userId: string,
    role: string
  ): Promise<{ allowed: boolean; reason?: string; conversation?: IConversation }> {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { allowed: false, reason: 'Invalid conversation identifier' };
    }

    const conv = await Conversation.findById(conversationId);
    if (!conv || conv.isArchived) {
      return { allowed: false, reason: 'Conversation not found or has been archived' };
    }

    const userObjId = new mongoose.Types.ObjectId(userId);

    // Rule 1: Admin & Principal Executive Restricted Group
    if (conv.type === 'PRINCIPAL_RESTRICTED' || conv.type === 'ADMIN_RESTRICTED') {
      if (role === 'STUDENT') {
        return { allowed: false, reason: 'Students are strictly forbidden from discovering or accessing executive channels.' };
      }
      if (role === 'ADMIN') {
        return { allowed: true, conversation: conv };
      }
      // Faculty must be explicitly registered as an authorized member
      const isMember = conv.members.some((m) => m.userId.equals(userObjId));
      if (!isMember) {
        return { allowed: false, reason: 'Access requires explicit Admin / Principal authorization.' };
      }
      return { allowed: true, conversation: conv };
    }

    // Rule 2: Faculty-Only Group (Admin/Principal has full access)
    if (conv.type === 'FACULTY_ONLY') {
      if (role === 'STUDENT') {
        return { allowed: false, reason: 'Students are strictly prohibited from accessing faculty-only communication.' };
      }
      if (role === 'FACULTY' || role === 'STAFF' || role === 'ADMIN') {
        return { allowed: true, conversation: conv };
      }
      return { allowed: false, reason: 'Role not authorized for faculty communication.' };
    }

    // Rule 3: Whole-College Group
    if (conv.type === 'WHOLE_COLLEGE') {
      // All verified active accounts can access whole college communications
      return { allowed: true, conversation: conv };
    }

    // Rule 4: Class Groups (e.g. CS 3rd Year)
    if (conv.type === 'CLASS_GROUP') {
      if (role === 'ADMIN') {
        return { allowed: true, conversation: conv };
      }

      if (role === 'FACULTY' || role === 'STAFF') {
        // Faculty assigned to department or class, or explicit member
        const faculty = await Faculty.findOne({ userId: userObjId }).lean();
        if (!faculty) {
          return { allowed: false, reason: 'Faculty record not found' };
        }
        if (conv.departmentId && faculty.departmentId && conv.departmentId.equals(faculty.departmentId as any)) {
          return { allowed: true, conversation: conv };
        }
        const isMember = conv.members.some((m) => m.userId.equals(userObjId));
        if (isMember) {
          return { allowed: true, conversation: conv };
        }
        return { allowed: false, reason: 'Faculty member is not assigned to this class or department.' };
      }

      if (role === 'STUDENT') {
        // Must be enrolled in this class/year
        const student = await Student.findOne({ userId: userObjId }).lean();
        if (!student) {
          return { allowed: false, reason: 'Student record not found.' };
        }
        if (conv.classId && student.classId && conv.classId.equals(student.classId as any)) {
          return { allowed: true, conversation: conv };
        }
        if (conv.year && student.year === conv.year) {
          if (!conv.departmentId || conv.departmentId.equals(student.departmentId as any)) {
            return { allowed: true, conversation: conv };
          }
        }
        const isMember = conv.members.some((m) => m.userId.equals(userObjId));
        if (isMember) {
          return { allowed: true, conversation: conv };
        }
        return { allowed: false, reason: 'Student is not enrolled in this class or academic year.' };
      }

      return { allowed: false, reason: 'Unauthorized role.' };
    }

    // Rule 5: Direct Messages
    if (conv.type === 'DIRECT') {
      const isMember = conv.members.some((m) => m.userId.equals(userObjId));
      if (!isMember) {
        return { allowed: false, reason: 'You are not a participant in this private conversation.' };
      }
      return { allowed: true, conversation: conv };
    }

    return { allowed: false, reason: 'Unknown conversation policy.' };
  }

  /**
   * Returns authorized conversations visible to the caller.
   * Completely filters out groups the user is not entitled to discover.
   */
  static async getVisibleConversations(userId: string, role: string): Promise<any[]> {
    await this.ensureDefaultGroups();
    const userObjId = new mongoose.Types.ObjectId(userId);

    const allConversations = await Conversation.find({ isArchived: false })
      .populate('classId', 'name year section')
      .populate('departmentId', 'name code')
      .lean();

    const accessibleConversations: any[] = [];

    for (const conv of allConversations) {
      const access = await this.canUserAccessConversation(conv._id, userId, role);
      if (access.allowed) {
        // Strip sensitive internal fields if any
        accessibleConversations.push({
          id: conv._id.toString(),
          _id: conv._id,
          name: conv.name,
          type: conv.type,
          description: conv.description,
          keyVersion: conv.keyVersion,
          lastMessage: conv.lastMessage,
          updatedAt: conv.updatedAt,
          memberCount: conv.members.length,
          isAnnouncementOnly: conv.isAnnouncementOnly,
        });
      }
    }

    return accessibleConversations;
  }

  /**
   * Retrieves paginated messages for an authorized conversation.
   */
  static async getMessages(
    conversationId: string,
    userId: string,
    role: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: IChatMessage[]; total: number; page: number }> {
    const access = await this.canUserAccessConversation(conversationId, userId, role);
    if (!access.allowed) {
      throw new Error(`FORBIDDEN: ${access.reason}`);
    }

    const skip = (page - 1) * limit;
    const total = await ChatMessage.countDocuments({ conversationId });
    const messages = await ChatMessage.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Mark messages as read by this user
    const unreadMessageIds = messages
      .filter((m) => !m.readBy?.some((r) => r.userId.toString() === userId))
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      await ChatMessage.updateMany(
        { _id: { $in: unreadMessageIds } },
        { $push: { readBy: { userId: new mongoose.Types.ObjectId(userId), readAt: new Date() } } }
      );
    }

    return {
      messages: (messages as any[]).reverse(), // Return chronological order
      total,
      page,
    };
  }

  /**
   * Stores an end-to-end encrypted message.
   * Validates sender authorization, message ciphertext, and cryptographic nonce.
   */
  static async postMessage(params: {
    conversationId: string;
    senderId: string;
    senderRole: string;
    ciphertext: string;
    nonce: string;
    keyVersion?: number;
    replyTo?: string;
    attachments?: any[];
  }): Promise<IChatMessage> {
    const { conversationId, senderId, senderRole, ciphertext, nonce, keyVersion, replyTo, attachments } = params;

    const access = await this.canUserAccessConversation(conversationId, senderId, senderRole);
    if (!access.allowed) {
      throw new Error(`FORBIDDEN: ${access.reason}`);
    }

    if (access.conversation?.isAnnouncementOnly && senderRole !== 'ADMIN') {
      throw new Error('FORBIDDEN: Only the Admin / Principal can post in this announcement channel.');
    }

    if (!isValidBase64(ciphertext)) {
      throw new Error('INVALID_CIPHERTEXT: Message payload must be a valid base64 encrypted string.');
    }

    if (!isValidNonce(nonce)) {
      throw new Error('INVALID_NONCE: Message nonce must be a valid 24-byte base64 string.');
    }

    // Fetch sender profile details to display verified account identity
    const user = await User.findById(senderId).lean();
    if (!user) {
      throw new Error('Sender account not found.');
    }

    let senderName = user.identifier;
    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: senderId }).lean();
      if (student?.fullName) senderName = student.fullName;
    } else if (user.role === 'FACULTY' || user.role === 'STAFF') {
      const faculty = await Faculty.findOne({ userId: senderId }).lean();
      if (faculty?.fullName) senderName = faculty.fullName;
    } else if (user.role === 'ADMIN') {
      senderName = 'Principal / Admin Office';
    }

    const message = await ChatMessage.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      senderId: new mongoose.Types.ObjectId(senderId),
      senderRole,
      senderIdentifier: user.identifier,
      senderName,
      ciphertext,
      nonce,
      keyVersion: keyVersion || 1,
      replyTo: replyTo && mongoose.Types.ObjectId.isValid(replyTo) ? new mongoose.Types.ObjectId(replyTo) : undefined,
      attachments: attachments || [],
      readBy: [{ userId: new mongoose.Types.ObjectId(senderId), readAt: new Date() }],
    });

    // Update conversation last message pointer
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        messageId: message._id,
        senderId: message.senderId,
        timestamp: message.createdAt,
      },
    });

    return message;
  }

  /**
   * Stores an encrypted attachment file in private storage outside static serving.
   */
  static async saveEncryptedAttachment(params: {
    conversationId: string;
    userId: string;
    role: string;
    fileBuffer: Buffer;
    fileNonce: string;
    originalFileNameCiphertext?: string;
    mimeTypeCiphertext?: string;
  }): Promise<{ attachmentId: string; storageKey: string; fileSize: number; fileNonce: string }> {
    const { conversationId, userId, role, fileBuffer, fileNonce, originalFileNameCiphertext, mimeTypeCiphertext } = params;

    const access = await this.canUserAccessConversation(conversationId, userId, role);
    if (!access.allowed) {
      throw new Error(`FORBIDDEN: ${access.reason}`);
    }

    if (!isValidNonce(fileNonce)) {
      throw new Error('INVALID_NONCE: File nonce must be a valid 24-byte base64 string.');
    }

    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB limit
    if (fileBuffer.length > MAX_SIZE) {
      throw new Error('FILE_TOO_LARGE: Attachment size exceeds the 25MB collegiate limit.');
    }

    const attachmentId = crypto.randomUUID();
    const storageKey = `enc_${Date.now()}_${crypto.randomBytes(12).toString('hex')}.bin`;
    const targetPath = path.join(ATTACHMENTS_DIR, storageKey);

    await fs.promises.writeFile(targetPath, fileBuffer);

    return {
      attachmentId,
      storageKey,
      fileSize: fileBuffer.length,
      fileNonce,
    };
  }

  /**
   * Retrieves an encrypted attachment file buffer, verifying conversation access.
   */
  static async getEncryptedAttachmentStream(params: {
    conversationId: string;
    attachmentId: string;
    userId: string;
    role: string;
  }): Promise<{ filePath: string; originalFileNameCiphertext?: string }> {
    const { conversationId, attachmentId, userId, role } = params;

    const access = await this.canUserAccessConversation(conversationId, userId, role);
    if (!access.allowed) {
      throw new Error(`FORBIDDEN: ${access.reason}`);
    }

    const message = await ChatMessage.findOne({
      conversationId,
      'attachments.attachmentId': attachmentId,
    }).lean();

    if (!message) {
      throw new Error('Attachment not found in conversation.');
    }

    const attachment = message.attachments.find((a) => a.attachmentId === attachmentId);
    if (!attachment) {
      throw new Error('Attachment details not found.');
    }

    const filePath = path.join(ATTACHMENTS_DIR, attachment.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new Error('Attachment binary payload missing from storage.');
    }

    return {
      filePath,
      originalFileNameCiphertext: attachment.originalFileNameCiphertext,
    };
  }

  /**
   * Registers a user's E2EE public key.
   */
  static async registerUserPublicKey(userId: string, publicKey: string): Promise<void> {
    if (!isValidPublicKey(publicKey)) {
      throw new Error('INVALID_PUBLIC_KEY: Public key must be a valid 32-byte base64 string.');
    }

    await User.findByIdAndUpdate(userId, { e2eePublicKey: publicKey });
  }

  /**
   * Stores an encrypted group key envelope for a specific user.
   */
  static async storeEncryptedGroupKey(params: {
    conversationId: string;
    userId: string;
    encryptedKey: string;
    nonce: string;
    keyVersion: number;
  }): Promise<void> {
    const { conversationId, userId, encryptedKey, nonce, keyVersion } = params;

    if (!isValidBase64(encryptedKey) || !isValidNonce(nonce)) {
      throw new Error('Invalid encrypted group key envelope or nonce.');
    }

    await Conversation.findByIdAndUpdate(conversationId, {
      $pull: { encryptedGroupKeys: { userId: new mongoose.Types.ObjectId(userId) } },
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $push: {
        encryptedGroupKeys: {
          userId: new mongoose.Types.ObjectId(userId),
          encryptedKey,
          nonce,
          keyVersion,
        },
      },
    });
  }

  /**
   * Retrieves the encrypted group key envelope for a given user in a conversation.
   */
  static async getGroupKeyForUser(
    conversationId: string,
    userId: string
  ): Promise<{ encryptedKey: string; nonce: string; keyVersion: number } | null> {
    const conv = await Conversation.findById(conversationId).lean();
    if (!conv) return null;

    const userKey = conv.encryptedGroupKeys?.find((k) => k.userId.toString() === userId);
    if (!userKey) return null;

    return {
      encryptedKey: userKey.encryptedKey,
      nonce: userKey.nonce,
      keyVersion: userKey.keyVersion,
    };
  }
}
