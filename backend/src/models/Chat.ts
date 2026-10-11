import mongoose, { Document, Schema } from 'mongoose';

export type ConversationType =
  | 'CLASS_GROUP'
  | 'FACULTY_ONLY'
  | 'WHOLE_COLLEGE'
  | 'PRINCIPAL_RESTRICTED'
  | 'ADMIN_RESTRICTED'
  | 'DIRECT';

export interface IConversationMember {
  userId: mongoose.Types.ObjectId;
  role: 'ADMIN' | 'MEMBER' | 'MODERATOR';
  joinedAt: Date;
}

export interface IEncryptedGroupKey {
  userId: mongoose.Types.ObjectId;
  encryptedKey: string; // Base64 ciphertext of group key, encrypted with member's public key
  nonce: string; // Base64 nonce for key box
  keyVersion: number;
}

export interface IConversation extends Document {
  type: ConversationType;
  name: string;
  description?: string;
  classId?: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  year?: number;
  isAnnouncementOnly?: boolean;
  members: IConversationMember[];
  keyVersion: number;
  encryptedGroupKeys: IEncryptedGroupKey[];
  lastMessage?: {
    messageId: mongoose.Types.ObjectId;
    senderId: mongoose.Types.ObjectId;
    timestamp: Date;
  };
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMemberSchema = new Schema<IConversationMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['ADMIN', 'MEMBER', 'MODERATOR'], default: 'MEMBER' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EncryptedGroupKeySchema = new Schema<IEncryptedGroupKey>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedKey: { type: String, required: true },
    nonce: { type: String, required: true },
    keyVersion: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    type: {
      type: String,
      enum: ['CLASS_GROUP', 'FACULTY_ONLY', 'WHOLE_COLLEGE', 'PRINCIPAL_RESTRICTED', 'ADMIN_RESTRICTED', 'DIRECT'],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    classId: { type: Schema.Types.ObjectId, ref: 'CollegeClass', index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    year: { type: Number, index: true },
    isAnnouncementOnly: { type: Boolean, default: false },
    members: { type: [ConversationMemberSchema], default: [] },
    keyVersion: { type: Number, default: 1 },
    encryptedGroupKeys: { type: [EncryptedGroupKeySchema], default: [] },
    lastMessage: {
      messageId: { type: Schema.Types.ObjectId },
      senderId: { type: Schema.Types.ObjectId, ref: 'User' },
      timestamp: { type: Date },
    },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ 'members.userId': 1 });
ConversationSchema.index({ type: 1, classId: 1 });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

export interface IChatAttachment {
  attachmentId: string;
  storageKey: string;
  fileSize: number;
  fileNonce: string; // Base64 24-byte nonce used to encrypt binary attachment
  originalFileNameCiphertext?: string;
  mimeTypeCiphertext?: string;
  sha256Hash?: string;
}

export interface IChatMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: string;
  senderIdentifier: string;
  senderName: string;
  ciphertext: string; // Base64 encrypted message content (NEVER plaintext)
  nonce: string; // Base64 24-byte nonce
  keyVersion: number;
  replyTo?: mongoose.Types.ObjectId;
  attachments: IChatAttachment[];
  isEdited: boolean;
  isDeleted: boolean;
  readBy: {
    userId: mongoose.Types.ObjectId;
    readAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatAttachmentSchema = new Schema<IChatAttachment>(
  {
    attachmentId: { type: String, required: true },
    storageKey: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileNonce: { type: String, required: true },
    originalFileNameCiphertext: { type: String },
    mimeTypeCiphertext: { type: String },
    sha256Hash: { type: String },
  },
  { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    senderRole: { type: String, required: true },
    senderIdentifier: { type: String, required: true },
    senderName: { type: String, required: true },
    ciphertext: { type: String, required: true },
    nonce: { type: String, required: true },
    keyVersion: { type: Number, default: 1 },
    replyTo: { type: Schema.Types.ObjectId, ref: 'ChatMessage' },
    attachments: { type: [ChatAttachmentSchema], default: [] },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
