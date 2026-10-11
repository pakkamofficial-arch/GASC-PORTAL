import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AccountStatus, UserRole } from '../types';

export interface IUser extends Document {
  identifier: string; // Register No (Student), Employee ID (Faculty), or Username (Admin)
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  isActivated: boolean;
  mustChangePassword?: boolean;
  activationCode?: string;
  activatedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  deactivatedBy?: mongoose.Types.ObjectId;
  deactivationReason?: string;
  email?: string;
  phone?: string;
  isPrimaryAdmin?: boolean;
  adminImmutableId?: string;
  e2eePublicKey?: string;
  refreshTokens: string[];
  lastLogin?: Date;
  comparePassword(password: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    identifier: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['STUDENT', 'STAFF', 'FACULTY', 'ADMIN'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
    isActivated: {
      type: Boolean,
      default: true,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
      index: true,
    },
    activationCode: {
      type: String,
    },
    activatedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deactivatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    deactivationReason: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    isPrimaryAdmin: {
      type: Boolean,
      default: false,
    },
    adminImmutableId: {
      type: String,
      trim: true,
    },
    e2eePublicKey: {
      type: String,
      trim: true,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce single primary administrator via pre-save hook and unique partial index
UserSchema.pre('save', async function (next) {
  if (this.isPrimaryAdmin && (this.isModified('isPrimaryAdmin') || this.isNew)) {
    const existing = await (this.constructor as any).findOne({
      isPrimaryAdmin: true,
      _id: { $ne: this._id },
    });
    if (existing) {
      const err: any = new Error('E11000 duplicate key error: only one primary administrator is allowed');
      err.code = 11000;
      return next(err);
    }
  }
  next();
});

// Enforce exactly one primary admin in the database
UserSchema.index(
  { isPrimaryAdmin: 1 },
  { unique: true, partialFilterExpression: { isPrimaryAdmin: true } }
);

// Enforce uniqueness of adminImmutableId
UserSchema.index(
  { adminImmutableId: 1 },
  { unique: true, partialFilterExpression: { adminImmutableId: { $type: 'string' } } }
);

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
