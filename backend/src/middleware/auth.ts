import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('jwt', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
      });
    }
    req.user = user;
    next();
  })(req, res, next);
}
