import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from '../db/pool';

export function configurePassport() {
  // JWT Strategy
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'dev-secret',
  }, async (payload, done) => {
    try {
      const { rows } = await query('SELECT id, email, name, avatar_url FROM users WHERE id = $1', [payload.sub]);
      if (!rows[0]) return done(null, false);
      return done(null, rows[0]);
    } catch (err) {
      return done(err, false);
    }
  }));

  // GitHub OAuth
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_ID !== 'placeholder') {
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: `http://localhost:${process.env.PORT || 3001}/api/auth/oauth/github/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `github_${profile.id}@noemail.com`;
        let { rows } = await query('SELECT * FROM users WHERE github_id = $1 OR email = $2', [profile.id, email]);
        if (!rows[0]) {
          const res = await query(
            'INSERT INTO users (email, name, avatar_url, github_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, profile.displayName || profile.username, profile.photos?.[0]?.value, profile.id]
          );
          return done(null, res.rows[0]);
        }
        return done(null, rows[0]);
      } catch (err) { return done(err as Error); }
    }));
  }

  // Google OAuth
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'placeholder') {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `http://localhost:${process.env.PORT || 3001}/api/auth/oauth/google/callback`,
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value!;
        let { rows } = await query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, email]);
        if (!rows[0]) {
          const res = await query(
            'INSERT INTO users (email, name, avatar_url, google_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [email, profile.displayName, profile.photos?.[0]?.value, profile.id]
          );
          return done(null, res.rows[0]);
        }
        return done(null, rows[0]);
      } catch (err) { return done(err as Error); }
    }));
  }
}
