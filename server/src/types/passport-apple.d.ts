declare module 'passport-apple' {
  export interface AppleStrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyLocation?: string;
    callbackURL: string;
    scope?: string[];
    passReqToCallback?: boolean;
  }
  export type AppleVerifyCallback = (
    accessToken: string,
    refreshToken: string,
    idToken: Record<string, unknown>,
    profile: Record<string, unknown>,
    done: (err: Error | null, user?: unknown) => void,
  ) => void;
  export class Strategy {
    constructor(options: AppleStrategyOptions, verify: AppleVerifyCallback);
    name: string;
  }
  const _default: { Strategy: typeof Strategy };
  export default _default;
}
