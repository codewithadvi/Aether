import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import passport from 'passport';

import { configurePassport } from './middleware/passport';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import papersRoutes from './routes/papers';
import notesRoutes from './routes/notes';
import insightsRoutes from './routes/insights';
import ideasRoutes from './routes/ideas';
import collectionsRoutes from './routes/collections';
import statsRoutes from './routes/stats';
import searchRoutes from './routes/search';
import exportRoutes from './routes/export';
import semanticScholarRoutes from './routes/semanticScholar';
import researchIntelRoutes from './routes/researchIntel';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security & middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Passport
configurePassport();
app.use(passport.initialize());

// Rate limiting
app.use('/api/', rateLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/ideas', ideasRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/semantic-scholar', semanticScholarRoutes);
app.use('/api/intel', researchIntelRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Research Paper Tracker API ready`);
});

export default app;
