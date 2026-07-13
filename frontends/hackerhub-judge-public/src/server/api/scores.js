import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, j.name as judge_name
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      ORDER BY s.timestamp DESC
    `);

    const formattedScores = rows.map(score => ({
      id: score.id,
      teamId: score.team_id,
      judgeId: score.judge_id,
      judgeName: score.judge_name,
      innovation: score.innovation,
      technicalComplexity: score.technical_complexity,
      impact: score.impact,
      presentation: score.presentation,
      feedback: score.feedback,
      timestamp: score.timestamp
    }));

    res.json(formattedScores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

router.get('/team/:teamId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, j.name as judge_name
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      WHERE s.team_id = ?
      ORDER BY s.timestamp DESC
    `, [req.params.teamId]);

    const formattedScores = rows.map(score => ({
      id: score.id,
      teamId: score.team_id,
      judgeId: score.judge_id,
      judgeName: score.judge_name,
      innovation: score.innovation,
      technicalComplexity: score.technical_complexity,
      impact: score.impact,
      presentation: score.presentation,
      feedback: score.feedback,
      timestamp: score.timestamp
    }));

    res.json(formattedScores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team scores' });
  }
});

router.get('/judge/:judgeId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, j.name as judge_name
      FROM scores s
      JOIN judges j ON s.judge_id = j.id
      WHERE s.judge_id = ?
      ORDER BY s.timestamp DESC
    `, [req.params.judgeId]);

    const formattedScores = rows.map(score => ({
      id: score.id,
      teamId: score.team_id,
      judgeId: score.judge_id,
      judgeName: score.judge_name,
      innovation: score.innovation,
      technicalComplexity: score.technical_complexity,
      impact: score.impact,
      presentation: score.presentation,
      feedback: score.feedback,
      timestamp: score.timestamp
    }));

    res.json(formattedScores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch judge scores' });
  }
});

router.post('/', async (req, res) => {
  const { id, teamId, judgeId, innovation, technicalComplexity, impact, presentation, feedback } = req.body;

  if (!id || !teamId || !judgeId || innovation === undefined || technicalComplexity === undefined || 
      impact === undefined || presentation === undefined) {
    return res.status(400).json({ error: 'Missing required score information' });
  }

  try {
    const [judges] = await pool.query('SELECT name FROM judges WHERE id = ?', [judgeId]);
    if (judges.length === 0) {
      return res.status(404).json({ error: 'Judge not found' });
    }

    const [teams] = await pool.query('SELECT name FROM teams WHERE id = ?', [teamId]);
    if (teams.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const [existingScores] = await pool.query(
      'SELECT id FROM scores WHERE team_id = ? AND judge_id = ?',
      [teamId, judgeId]
    );

    if (existingScores.length > 0) {
      await pool.query(`
        UPDATE scores
        SET innovation = ?, technical_complexity = ?, impact = ?, presentation = ?, feedback = ?, timestamp = CURRENT_TIMESTAMP
        WHERE team_id = ? AND judge_id = ?
      `, [innovation, technicalComplexity, impact, presentation, feedback || '', teamId, judgeId]);

      res.json({
        id,
        teamId,
        judgeId,
        judgeName: judges[0].name,
        innovation,
        technicalComplexity,
        impact,
        presentation,
        feedback: feedback || '',
        timestamp: new Date().toISOString()
      });
    } else {
      await pool.query(`
        INSERT INTO scores (id, team_id, judge_id, innovation, technical_complexity, impact, presentation, feedback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, teamId, judgeId, innovation, technicalComplexity, impact, presentation, feedback || '']);

      res.status(201).json({
        id,
        teamId,
        judgeId,
        judgeName: judges[0].name,
        innovation,
        technicalComplexity,
        impact,
        presentation,
        feedback: feedback || '',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to save score' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM scores WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Score not found' });
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete score' });
  }
});

router.get('/rankings', async (req, res) => {
  const { track, problemId } = req.query;

  try {
    let query = `
      SELECT 
        t.id,
        t.name,
        t.team_number,
        p.name AS problem_statement,
        t.track,
        COUNT(DISTINCT s.judge_id) AS judge_count,
        ROUND(AVG(s.innovation), 1) AS avg_innovation,
        ROUND(AVG(s.technical_complexity), 1) AS avg_technical,
        ROUND(AVG(s.impact), 1) AS avg_impact,
        ROUND(AVG(s.presentation), 1) AS avg_presentation,
        ROUND(AVG((s.innovation + s.technical_complexity + s.impact + s.presentation) / 4), 1) AS avg_total
      FROM 
        teams t
      LEFT JOIN 
        scores s ON t.id = s.team_id
      JOIN 
        problems p ON t.problem_id = p.id
    `;

    const params = [];
    const conditions = [];

    if (track) {
      conditions.push('t.track = ?');
      params.push(track);
    }

    if (problemId) {
      conditions.push('t.problem_id = ?');
      params.push(problemId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += `
      GROUP BY 
        t.id, t.name, t.team_number, p.name, t.track
      ORDER BY 
        avg_total DESC
    `;

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
});

export default router;
