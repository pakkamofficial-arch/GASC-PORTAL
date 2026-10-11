import mongoose, { Document, Schema } from 'mongoose';

export interface IAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isAi?: boolean;
  isError?: boolean;
}

export interface IAIChatConversation extends Document {
  userId: mongoose.Types.ObjectId;
  messages: IAIChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const AIChatMessageSchema = new Schema<IAIChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    isAi: { type: Boolean, default: false },
    isError: { type: Boolean, default: false },
  },
  { _id: false }
);

const AIChatConversationSchema = new Schema<IAIChatConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    messages: { type: [AIChatMessageSchema], default: [] },
  },
  { timestamps: true }
);

export const AIChatConversation = mongoose.model<IAIChatConversation>(
  'AIChatConversation',
  AIChatConversationSchema
);
