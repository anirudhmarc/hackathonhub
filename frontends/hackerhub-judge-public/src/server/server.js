import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { testConnection } from './db.js';
import problemStatementsRouter from './api/problemStatements.js';
import teamsRouter from './api/teams.js';
import judgesRouter from './api/judges.js';
import scoresRouter from './api/scores.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    process.env.VITE_ADMIN_COGNITO_REDIRECT_URI?.replace('/callback', '') || 'http://localhost:8080',
    'http://localhost:8080',
    'http://localhost:3000',
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.json());

testConnection()
  .then(connected => {
    if (!connected) {
      process.exit(1);
    }
  });

app.use('/api/problem-statements', problemStatementsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/judges', judgesRouter);
app.use('/api/scores', scoresRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.listen(PORT, () => {
});

export default app;
