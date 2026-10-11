import dns from 'dns';
import mongoose from 'mongoose';
import { config } from './index';

// Ensure reliable SRV resolution for cloud clusters (e.g. MongoDB Atlas)
if (config.mongoUri.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]);
  } catch {
    // Fallback gracefully if custom DNS servers cannot be set
  }
}

export const connectDatabase = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(config.mongoUri);
    const sanitizedUri = config.mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log(`[Database] MongoDB connected successfully to ${sanitizedUri}`);
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected cleanly');
  } catch (error) {
    console.error('[Database] Disconnect error:', error);
  }
};
