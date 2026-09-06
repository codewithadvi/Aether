import { Router, Request, Response } from 'express';
import { query } from '../db/pool';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/stats/dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    const [weekly, streak, trends, badges, recentPapers] = await Promise.all([
      getWeeklyStats(user.id),
      getReadingStreak(user.id),
      getHistoricalTrends(user.id),
      getUserBadges(user.id),
      getRecentPapers(user.id),
    ]);
    res.json({ success: true, data: { weekly, streak, trends, badges, recentPapers } });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/weekly', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    res.json({ success: true, data: await getWeeklyStats(user.id) });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/trends', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    res.json({ success: true, data: await getHistoricalTrends(user.id) });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

router.get('/badges', async (req: Request, res: Response) => {
  const user = req.user as any;
  try {
    res.json({ success: true, data: await getUserBadges(user.id) });
  } catch (err: any) { res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }); }
});

async function getWeeklyStats(userId: string) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [totalRes, fieldRes, authorRes] = await Promise.all([
    query('SELECT COUNT(*)::int AS total FROM papers WHERE user_id = $1 AND read_at >= $2', [userId, weekStart]),
    query(`SELECT field, COUNT(*)::int AS count FROM papers WHERE user_id = $1 AND read_at >= $2 AND field IS NOT NULL GROUP BY field ORDER BY count DESC LIMIT 8`, [userId, weekStart]),
    query(`SELECT elem AS author, COUNT(*)::int AS count FROM papers, jsonb_array_elements_text(authors) AS elem WHERE user_id = $1 AND read_at >= $2 GROUP BY elem ORDER BY count DESC LIMIT 5`, [userId, weekStart]),
  ]);

  return {
    total: totalRes.rows[0]?.total || 0,
    byField: fieldRes.rows,
    topAuthors: authorRes.rows,
    weekStart: weekStart.toISOString(),
  };
}

async function getReadingStreak(userId: string) {
  const { rows } = await query(`
    SELECT DATE(read_at) AS day FROM papers WHERE user_id = $1
    GROUP BY DATE(read_at) ORDER BY day DESC
  `, [userId]);

  if (!rows.length) return { length: 0, isActive: false, longestStreak: 0 };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  let streak = 0;
  let longestStreak = 0;
  let currentDate = new Date(rows[0].day);

  // Check if streak is active (today or yesterday)
  const isActive = currentDate >= yesterday;
  if (!isActive) return { length: 0, isActive: false, longestStreak: 1 };

  let cur = 0;
  for (let i = 0; i < rows.length; i++) {
    const day = new Date(rows[i].day);
    if (i === 0) { cur = 1; }
    else {
      const prevDay = new Date(rows[i - 1].day);
      const diff = (prevDay.getTime() - day.getTime()) / (1000 * 60 * 60 * 24);
      if (Math.round(diff) === 1) cur++;
      else { longestStreak = Math.max(longestStreak, cur); cur = 1; }
    }
    streak = cur;
  }
  longestStreak = Math.max(longestStreak, streak);
  return { length: streak, isActive: true, longestStreak };
}

async function getHistoricalTrends(userId: string) {
  const { rows } = await query(`
    SELECT 
      DATE_TRUNC('week', read_at) AS week,
      COUNT(*)::int AS count,
      json_object_agg(field, cnt) AS field_breakdown
    FROM (
      SELECT read_at, field, COUNT(*) OVER (PARTITION BY DATE_TRUNC('week', read_at), field) AS cnt
      FROM papers WHERE user_id = $1 AND read_at >= NOW() - INTERVAL '84 days'
    ) sub
    GROUP BY DATE_TRUNC('week', read_at)
    ORDER BY week ASC
  `, [userId]);
  return rows;
}

async function getUserBadges(userId: string) {
  const { rows } = await query('SELECT * FROM badges WHERE user_id = $1 ORDER BY earned_at DESC', [userId]);
  return rows;
}

async function getRecentPapers(userId: string) {
  const { rows } = await query(
    'SELECT id, title, authors, field, venue, abstract, doi, read_at FROM papers WHERE user_id = $1 ORDER BY read_at DESC LIMIT 5',
    [userId]
  );
  return rows;
}

export default router;
