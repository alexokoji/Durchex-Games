import type { Request, Response, NextFunction } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found' });
}

// Final error handler.  `next` is kept in the signature so Express recognises
// this as an error-handling middleware (4 params required).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code ?? 'error', message: err.message });
    return;
  }
  if (err && typeof err === 'object' && 'name' in err && (err as Error).name === 'ValidationError') {
    res.status(400).json({ error: 'validation_error', message: (err as Error).message });
    return;
  }
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'internal_error' });
}
