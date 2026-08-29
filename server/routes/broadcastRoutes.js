import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------------------------------------------------
// GET /api/broadcasts — Fetch broadcast announcements / directives from MySQL
// ------------------------------------------------------------
router.get('/', async (req, res) => {
  const { targetSchoolId } = req.query;
  try {
    let sql = 'SELECT * FROM broadcasts ORDER BY created_at DESC';
    let params = [];
    if (targetSchoolId && targetSchoolId !== 'all') {
      sql = 'SELECT * FROM broadcasts WHERE target_school_id = ? OR target_school_id = "all" ORDER BY created_at DESC';
      params = [targetSchoolId];
    }

    const [rows] = await pool.query(sql, params);

    const formatted = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || r.message || '',
      message: r.message || r.description || '',
      imageUrl: r.image_url,
      videoUrl: r.video_url,
      targetSchoolId: r.target_school_id,
      sender: r.sender,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[BROADCASTS API ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// POST /api/broadcasts — Publish a new directive / broadcast note to MySQL
// ------------------------------------------------------------
router.post('/', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { title, description, message, imageUrl, videoUrl, targetSchoolId, sender } = req.body;
    const bodyContent = description || message;

    if (!title || !bodyContent) {
      return res.status(400).json({ success: false, error: 'Title and Description/Message are required.' });
    }

    const sql = `
      INSERT INTO broadcasts (title, description, message, image_url, video_url, target_school_id, sender)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      title,
      bodyContent,
      bodyContent,
      imageUrl || null,
      videoUrl || null,
      targetSchoolId || 'all',
      sender || req.user?.name || 'Super Admin'
    ]);

    const newBroadcast = {
      id: result.insertId,
      title,
      description: bodyContent,
      message: bodyContent,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      targetSchoolId: targetSchoolId || 'all',
      sender: sender || req.user?.name || 'Super Admin',
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({ success: true, message: 'Broadcast directive published successfully.', data: newBroadcast });
  } catch (error) {
    console.error('[BROADCASTS API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// DELETE /api/broadcasts/:id — Delete a broadcast directive from MySQL
// ------------------------------------------------------------
router.delete('/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const broadcastId = parseInt(req.params.id);

  if (isNaN(broadcastId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid broadcast ID.' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM broadcasts WHERE id = ?', [broadcastId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Broadcast directive not found.' });
    }

    await pool.query('DELETE FROM broadcasts WHERE id = ?', [broadcastId]);

    return res.json({
      success: true,
      message: 'Broadcast directive deleted successfully.'
    });
  } catch (error) {
    console.error('[BROADCASTS API DELETE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;
