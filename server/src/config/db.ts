import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env';

export async function connectDb(): Promise<void> {
  if (env.mongoUri.startsWith('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('[mongo] using DNS servers', dns.getServers().join(', '));
  }

  mongoose.set('strictQuery', true);
  mongoose.connection.on('error',     err => console.error('[mongo] error', err));
  mongoose.connection.on('disconnected', () => console.warn('[mongo] disconnected'));
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !env.isProd,
  });
  console.log(`[mongo] connected → ${maskUri(env.mongoUri)}`);
}

function maskUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}
