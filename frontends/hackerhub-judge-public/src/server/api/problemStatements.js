import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM problems ORDER BY id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem statements' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM problems WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Problem statement not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch problem statement' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Problem statement name is required' });
  }

  try {
    const [result] = await pool.query('INSERT INTO problems (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create problem statement' });
  }
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Problem statement name is required' });
  }

  try {
    const [result] = await pool.query('UPDATE problems SET name = ? WHERE id = ?', [name, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Problem statement not found' });
    }

    res.json({ id: parseInt(req.params.id), name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update problem statement' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM problems WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Problem statement not found' });
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete problem statement' });
  }
});

export default router;
