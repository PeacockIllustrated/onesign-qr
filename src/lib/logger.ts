/**
 * Structured logger for production observability.
 *
 * In production (Vercel), outputs JSON lines that are automatically
 * ingested by Vercel's log pipeline. In development, outputs
 * human-readable format.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.error('Failed to create QR', { requestId, userId, errorCode });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  errorCode?: string;
  errorMessage?: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function log(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  if (IS_PRODUCTION) {
    // JSON output for structured log ingestion (Vercel, Datadog, etc.)
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
    console[method](JSON.stringify(entry));
  } else {
    // Human-readable output for development
    const prefix = `[${level.toUpperCase()}]`;
    if (context && Object.keys(context).length > 0) {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        prefix,
        message,
        context,
      );
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        prefix,
        message,
      );
    }
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),
};
