import fs from 'node:fs';
import passport from 'passport';
import { Strategy as GoogleStrategy, type Profile as GoogleProfile } from 'passport-google-oauth20';
// passport-apple has no built-in types; we untype it here.
// eslint-disable-next-line @typescript-eslint/no-var-requires
import AppleStrategyModule from 'passport-apple';
import { env } from './env';
import { User } from '../models/User';

const AppleStrategy: any = (AppleStrategyModule as any).Strategy ?? AppleStrategyModule;

passport.serializeUser((user: any, done) => done(null, user?._id?.toString?.() ?? null));
passport.deserializeUser(async (id: string, done) => {
  try {
    const u = await User.findById(id);
    done(null, u ?? false);
  } catch (e) { done(e as Error); }
});

// ─── Google ───────────────────────────────────────────────────────────────
if (env.google.enabled) {
  passport.use(new GoogleStrategy(
    {
      clientID:     env.google.clientId,
      clientSecret: env.google.clientSecret,
      callbackURL:  env.google.callbackUrl,
    },
    async (_accessToken: string, _refreshToken: string, profile: GoogleProfile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) return done(new Error('google_no_email'));

        let user = await User.findOne({ googleId: profile.id });
        if (!user) user = await User.findOne({ email });

        if (!user) {
          const baseUsername = (profile.displayName || email.split('@')[0]).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 18) || 'player';
          const username = await uniqueUsername(baseUsername);
          user = await User.create({
            email,
            username,
            googleId: profile.id,
            emailVerified: true,
          });
        } else if (!user.googleId) {
          user.googleId = profile.id;
          user.emailVerified = true;
          await user.save();
        }
        user.lastLoginAt = new Date();
        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ));
}

// ─── Apple ────────────────────────────────────────────────────────────────
if (env.apple.enabled && fs.existsSync(env.apple.privateKeyPath)) {
  const privateKeyString = fs.readFileSync(env.apple.privateKeyPath, 'utf8');
  passport.use(new AppleStrategy(
    {
      clientID:    env.apple.clientId,
      teamID:      env.apple.teamId,
      keyID:       env.apple.keyId,
      privateKeyString,
      callbackURL: env.apple.callbackUrl,
      scope: ['name', 'email'],
      passReqToCallback: false,
    },
    async (_accessToken: string, _refreshToken: string, idToken: any, profile: any, done: (err: Error | null, user?: unknown) => void) => {
      try {
        // Apple stuffs the user fields into the id_token. The library decodes
        // it and passes it in via the `idToken` argument.
        const sub:   string | undefined = idToken?.sub;
        const email: string | undefined = idToken?.email?.toLowerCase();
        if (!sub || !email) return done(new Error('apple_no_subject'));

        let user = await User.findOne({ appleId: sub });
        if (!user) user = await User.findOne({ email });

        if (!user) {
          const baseUsername = (profile?.name?.firstName ?? email.split('@')[0]).replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 18) || 'player';
          const username = await uniqueUsername(baseUsername);
          user = await User.create({
            email,
            username,
            appleId: sub,
            emailVerified: true,
          });
        } else if (!user.appleId) {
          user.appleId = sub;
          user.emailVerified = true;
          await user.save();
        }
        user.lastLoginAt = new Date();
        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    },
  ));
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base;
  let n = 0;
  while (await User.exists({ username: candidate })) {
    n++;
    candidate = `${base}${n}`;
    if (n > 200) {
      candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      break;
    }
  }
  return candidate;
}

export default passport;
