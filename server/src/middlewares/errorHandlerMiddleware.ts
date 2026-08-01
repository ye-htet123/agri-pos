import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/responseHandler';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandlerMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'စနစ်အတွင်း အမှားအယွင်းတစ်ခု ဖြစ်ပေါ်နေပါသည်။ (Internal Server Error)';

  console.error(`[Error Handler] ${req.method} ${req.url} - Status: ${statusCode}`, err);

  sendError(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : undefined);
};
