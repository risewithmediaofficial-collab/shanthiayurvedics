import { AppError } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Invalid value '${err.value}' for field '${err.path}'`;
    error = new AppError(message, 400);
  }

  // Mongoose Duplicate Key (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    const message = `Duplicate value '${value}' entered for ${field}. Please use another value.`;
    error = new AppError(message, 409);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Validation error: ${errors.join(', ')}`;
    error = new AppError(message, 422, errors);
  }

  // JWT Errors
  if (err.type === 'entity.parse.failed') error = new AppError('Request contains invalid JSON', 400);
  if (err.type === 'entity.too.large') error = new AppError('Request is too large. Upload fewer records at a time.', 413);
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired. Please refresh session.', 401);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';
  const responseMessage = error.isOperational
    ? error.message
    : (env.NODE_ENV === 'production' ? 'Internal server error' : error.message);

  return res.status(statusCode).json({
    success: false,
    requestId: req.id,
    status,
    message: responseMessage,
    ...(error.errors && { errors: error.errors }),
    ...(env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
