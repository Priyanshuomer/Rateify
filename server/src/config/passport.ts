import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import { env, googleEnabled } from "./env";
import { ApiError } from "../utils/ApiError";
import * as authService from "../services/auth.service";
import type { GoogleProfileData } from "../services/auth.service";

function toProfileData(profile: Profile): GoogleProfileData {
  return {
    googleId: profile.id,
    email: profile.emails?.[0]?.value?.toLowerCase(),
    emailVerified: (profile as any)._json?.email_verified === true,
    displayName: profile.displayName,
    givenName: profile.name?.givenName,
    familyName: profile.name?.familyName,
    photo: profile.photos?.[0]?.value,
  };
}

function register(
  strategyName: string,
  callbackPath: string,
  handler: (p: GoogleProfileData) => Promise<{ user: unknown; isNew: boolean }>,
) {
  passport.use(
    strategyName,
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID as string,
        clientSecret: env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: `${env.BASE_URL}/api/auth/google/${callbackPath}/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        const finish = done as unknown as (err: unknown, user?: unknown, info?: unknown) => void;
        try {
          const { user, isNew } = await handler(toProfileData(profile));
          finish(null, user, { isNew });
        } catch (err) {
          if (err instanceof ApiError) {
            return finish(null, false, { code: err.code, message: err.message });
          }
          finish(err);
        }
      },
    ),
  );
}

if (googleEnabled) {
  register("google-login", "login", authService.googleLogin);
  register("google-signup", "signup", authService.googleSignup);
}

export default passport;