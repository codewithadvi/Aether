import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import { query } from '../db/pool';
import { authRateLimiter } from '../middleware/rateLimiter';
import { authenticate } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET || 'dev-secret', {
    expiresIn: '30d',
  });
}

// POST /api/auth/register
router.post('/register', authRateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').trim().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: errors.array() } });
  }

  const { email, password, name } = req.body;
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows[0]) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RESOURCE', message: 'Email already registered' } });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, password_hash, name]
    );

    const token = signToken(rows[0].id);
    res.status(201).json({ success: true, data: { user: rows[0], token } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } });
  }

  const { email, password } = req.body;
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (!rows[0] || !rows[0].password_hash) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    const token = signToken(rows[0].id);
    const { password_hash, ...user } = rows[0];
    res.json({ success: true, data: { user, token } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const { rows } = await query(
      'SELECT id, email, name, avatar_url, total_papers_read, created_at FROM users WHERE id = $1',
      [user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 1 }),
], async (req: Request, res: Response) => {
  const user = req.user as any;
  const { name } = req.body;
  try {
    const { rows } = await query(
      'UPDATE users SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, email, name, avatar_url',
      [name, user.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// POST /api/auth/password-reset
router.post('/password-reset', authRateLimiter, [body('email').isEmail().normalizeEmail()],
  async (req: Request, res: Response) => {
    const { email } = req.body;
    try {
      const { rows } = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (rows[0]) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); // 1 hour
        await query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [rows[0].id, token, expires]
        );
        // TODO: send email with token
        console.log(`Password reset token for ${email}: ${token}`);
      }
      // Always respond success to prevent email enumeration
      res.json({ success: true, data: { message: 'If that email exists, a reset link has been sent' } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  }
);

// POST /api/auth/password-reset/:token
router.post('/password-reset/:token', [
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
], async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const { rows } = await query(
      'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    if (!rows[0]) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    }
    const hash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, rows[0].user_id]);
    await query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
    res.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// OAuth GitHub
router.get('/oauth/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/oauth/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
  }
);

// OAuth Google
router.get('/oauth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/oauth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = signToken(user.id);
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
  }
);

export default router;
