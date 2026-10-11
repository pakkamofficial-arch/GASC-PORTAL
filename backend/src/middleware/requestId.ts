import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

export const attachRequestId = (req: RequestWithId, res: Response, next: NextFunction): void => {
  const reqId = (req.headers['x-request-id'] as string) || `req-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  req.id = reqId;
  req.startTime = Date.now();
  res.setHeader('X-Request-Id', reqId);
  next();
};

/**
 * Redact sensitive fields (passwords, tokens, DOB) from log objects
 */
export const redactSensitiveData = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveKeys = ['password', 'newpassword', 'currentpassword', 'passwordhash', 'token', 'refreshtoken', 'accesstoken', 'secret', 'dob'];
  
  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const redacted: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      redacted[key] = redactSensitiveData(val);
    } else {
      redacted[key] = val;
    }
  }
  return redacted;
};
