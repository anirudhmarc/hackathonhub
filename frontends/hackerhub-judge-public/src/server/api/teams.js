import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [teams] = await pool.query(`
      SELECT t.*, p.name as problem_name
      FROM teams t
      JOIN problems p ON t.problem_id = p.id
      ORDER BY t.team_number
    `);
    
    const [members] = await pool.query(`
      SELECT team_id, name
      FROM team_members
      ORDER BY team_id, name
    `);
    
    const teamMembers = {};
    members.forEach(member => {
      if (!teamMembers[member.team_id]) {
        teamMembers[member.team_id] = [];
      }
      teamMembers[member.team_id].push(member.name);
    });
    
    const teamsWithMembers = teams.map(team => ({
      id: team.id,
      name: team.name,
      teamNumber: team.team_number,
      problemStatement: team.problem_id,
      problemName: team.problem_name,
      track: team.track,
      members: teamMembers[team.id] || []
    }));
    
    res.json(teamsWithMembers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [teams] = await pool.query(`
      SELECT t.*, p.name as problem_name
      FROM teams t
      JOIN problems p ON t.problem_id = p.id
      WHERE t.id = ?
    `, [req.params.id]);
    
    if (teams.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const team = teams[0];
    
    const [members] = await pool.query(`
      SELECT name
      FROM team_members
      WHERE team_id = ?
      ORDER BY name
    `, [req.params.id]);
    
    const teamWithMembers = {
      id: team.id,
      name: team.name,
      teamNumber: team.team_number,
      problemStatement: team.problem_id,
      problemName: team.problem_name,
      track: team.track,
      members: members.map(m => m.name)
    };
    
    res.json(teamWithMembers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

router.post('/', async (req, res) => {
  const { id, name, teamNumber, problemStatement, track, members } = req.body;
  
  if (!id || !name || !teamNumber || !problemStatement || !track) {
    return res.status(400).json({ error: 'Missing required team information' });
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.query(`
      INSERT INTO teams (id, name, team_number, problem_id, track)
      VALUES (?, ?, ?, ?, ?)
    `, [id, name, teamNumber, problemStatement, track]);
    
    if (members && members.length > 0) {
      const memberValues = members.map(memberName => [id, memberName]);
      await connection.query(`
        INSERT INTO team_members (team_id, name)
        VALUES ?
      `, [memberValues]);
    }
    
    await connection.commit();
    
    res.status(201).json({
      id,
      name,
      teamNumber,
      problemStatement,
      track,
      members: members || []
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create team' });
  } finally {
    connection.release();
  }
});

router.put('/:id', async (req, res) => {
  const { name, teamNumber, problemStatement, track, members } = req.body;
  const teamId = req.params.id;
  
  if (!name || !teamNumber || !problemStatement || !track) {
    return res.status(400).json({ error: 'Missing required team information' });
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [result] = await connection.query(`
      UPDATE teams
      SET name = ?, team_number = ?, problem_id = ?, track = ?
      WHERE id = ?
    `, [name, teamNumber, problemStatement, track, teamId]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Team not found' });
    }
    
    if (members) {
      await connection.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
      
      if (members.length > 0) {
        const memberValues = members.map(memberName => [teamId, memberName]);
        await connection.query(`
          INSERT INTO team_members (team_id, name)
          VALUES ?
        `, [memberValues]);
      }
    }
    
    await connection.commit();
    
    res.json({
      id: teamId,
      name,
      teamNumber,
      problemStatement,
      track,
      members: members || []
    });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to update team' });
  } finally {
    connection.release();
  }
});

router.delete('/:id', async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    await connection.query('DELETE FROM team_members WHERE team_id = ?', [req.params.id]);
    
    await connection.query('DELETE FROM scores WHERE team_id = ?', [req.params.id]);
    
    const [result] = await connection.query('DELETE FROM teams WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Team not found' });
    }
    
    await connection.commit();
    res.status(204).end();
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to delete team' });
  } finally {
    connection.release();
  }
});

export default router;
