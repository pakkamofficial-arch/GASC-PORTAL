import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitize objects and arrays against MongoDB operator injection ($gt, $ne, $where, etc.)
 */
const sanitizeValue = (val: any): any => {
  if (val === null || val === undefined) return val;

  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }

  if (typeof val === 'object' && val.constructor === Object) {
    const cleanObj: Record<string, any> = {};
    for (const [key, v] of Object.entries(val)) {
      // Strip any key starting with $ or containing . (MongoDB injection operators)
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleanObj[key] = sanitizeValue(v);
    }
    return cleanObj;
  }

  return val;
};

export const sanitizeNoSql = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};
