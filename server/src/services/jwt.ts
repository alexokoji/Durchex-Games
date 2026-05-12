import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;             // user id
  type: 'access' | 'refresh';
}

export function signAccessToken(userId: string): string {
  const opts: SignOptions = { expiresIn: env.jwtAccessTtl as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'access' } satisfies JwtPayload, env.jwtSecret, opts);
}

export function signRefreshToken(userId: string): string {
  const opts: SignOptions = { expiresIn: env.jwtRefreshTtl as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, type: 'refresh' } satisfies JwtPayload, env.jwtSecret, opts);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

export function issueTokenPair(userId: string) {
  return {
    accessToken:  signAccessToken(userId),
    refreshToken: signRefreshToken(userId),
  };
}
