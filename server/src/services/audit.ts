import type { Request } from 'express';
import { AuditLog, type AuditAction, type IAuditLog } from '../models/AuditLog';
import type { IUser } from '../models/User';

interface AuditArgs {
  actor: IUser;
  action: AuditAction;
  targetType: IAuditLog['targetType'];
  targetId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
}

/**
 * Write an audit log row. Errors are swallowed (we log them but never let
 * audit failure block the underlying admin action — failing closed here
 * could brick the admin console if the audit collection ever has issues).
 */
export async function audit(args: AuditArgs): Promise<void> {
  try {
    await AuditLog.create({
      actorId:    args.actor._id,
      actorEmail: args.actor.email,
      action:     args.action,
      targetType: args.targetType,
      targetId:   args.targetId,
      payload:    args.payload,
      ip:         args.ip,
    });
  } catch (err) {
    console.error('[audit] write failed', { action: args.action, err });
  }
}

/** Convenience: pull the requestor + IP from an Express req. */
export function auditFromReq(
  req: Request,
  action: AuditAction,
  targetType: IAuditLog['targetType'],
  targetId?: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const actor = req.user;
  if (!actor) return Promise.resolve();
  return audit({
    actor,
    action,
    targetType,
    targetId,
    payload,
    ip: (req.ip ?? req.socket.remoteAddress ?? '').toString() || undefined,
  });
}
