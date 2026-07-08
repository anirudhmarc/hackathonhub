import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM judges ORDER BY name');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch judges' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM judges WHERE id = ?', [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Judge not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch judge' });
  }
});

router.post('/', async (req, res) => {
  const { id, name } = req.body;

  if (!id || !name) {
    return res.status(400).json({ error: 'Judge ID and name are required' });
  }

  try {
    await pool.query('INSERT INTO judges (id, name) VALUES (?, ?)', [id, name]);
    res.status(201).json({ id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create judge' });
  }
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Judge name is required' });
  }

  try {
    const [result] = await pool.query('UPDATE judges SET name = ? WHERE id = ?', [name, req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Judge not found' });
    }

    res.json({ id: req.params.id, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update judge' });
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM scores WHERE judge_id = ?', [req.params.id]);

    const [result] = await connection.query('DELETE FROM judges WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Judge not found' });
    }

    await connection.commit();
    res.status(204).end();
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to delete judge' });
  } finally {
    connection.release();
  }
});

export default router;
