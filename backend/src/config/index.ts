import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  mongoUri:
    process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'pretest'
      ? process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/gasc_portal'
      : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gasc_portal',
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'gasc_kuthalam_super_secure_access_secret_2026_key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'gasc_kuthalam_super_secure_refresh_secret_2026_key',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  college: {
    name: process.env.COLLEGE_NAME || 'Government Arts and Science College, Kuthalam',
    affiliation: process.env.COLLEGE_AFFILIATION || 'Affiliated with Annamalai University, Mayiladuthurai District, Tamil Nadu',
    code: process.env.COLLEGE_CODE || 'GASC-KUTHALAM',
    address: process.env.COLLEGE_ADDRESS || 'Kuthalam, Mayiladuthurai District, Tamil Nadu - 609801',
    mottoTamil: 'அறிவே ஆற்றல் (Knowledge is Power)',
  },
  
  payment: {
    keyId: process.env.PAYMENT_GATEWAY_KEY_ID || 'demo_sandbox_key',
    keySecret: process.env.PAYMENT_GATEWAY_KEY_SECRET || 'demo_sandbox_secret',
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || 'gasc_webhook_demo_secret_2026',
  },
  
  ai: {
    apiKey: process.env.GEMINI_API_KEY || '',
    modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash',
  },
  
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
  }
};
