import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/index.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle known operational errors
  if (err instanceof AppError) {
    logger.warn(`AppError [${err.statusCode}]: ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      statusCode: err.statusCode,
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Handle Prisma known request errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        statusCode: 409,
      });
      return;
    }
    if (prismaErr.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
        statusCode: 404,
      });
      return;
    }
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      statusCode: 400,
      details: (err as any).issues,
    });
    return;
  }

  // Unexpected errors
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: config.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    statusCode: 500,
  });
}
