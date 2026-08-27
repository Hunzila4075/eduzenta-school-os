import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Fallback mock broadcast notes
const mockBroadcasts = [
  {
    id: 'note_01',
    title: 'Q3 System Policy & Mandatory Audit',
    description: 'All School Administrators must verify student fee chalans, sync final marks, and ensure attendance records are locked before the term deadline.',
    imageUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
    targetSchoolId: 'all',
    sender: 'Alex Vance (Super Admin HQ)',
    createdAt: '2026-08-27T10:00:00.000Z'
  }
];

// GET /api/broadcasts — Fetch broadcast announcements / directives
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
      description: r.description,
      imageUrl: r.image_url,
      videoUrl: r.video_url,
      targetSchoolId: r.target_school_id,
      sender: r.sender,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.warn('[BROADCASTS API] Database query failed, returning fallback memory data:', error.message);
    let filtered = mockBroadcasts;
    if (targetSchoolId && targetSchoolId !== 'all') {
      filtered = mockBroadcasts.filter(b => b.targetSchoolId === 'all' || b.targetSchoolId === targetSchoolId);
    }
    return res.json({ success: true, isMock: true, count: filtered.length, data: filtered });
  }
});

// POST /api/broadcasts — Publish a new directive / broadcast note
router.post('/', async (req, res) => {
  const { title, description, imageUrl, videoUrl, targetSchoolId, sender } = req.body;
  if (!title || !description) {
    return res.status(400).json({ success: false, error: 'Title and Description are required.' });
  }

  try {
    const sql = `
      INSERT INTO broadcasts (title, description, image_url, video_url, target_school_id, sender)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      title,
      description,
      imageUrl || null,
      videoUrl || null,
      targetSchoolId || 'all',
      sender || 'Super Admin'
    ]);

    const newBroadcast = {
      id: result.insertId,
      title,
      description,
      imageUrl,
      videoUrl,
      targetSchoolId: targetSchoolId || 'all',
      sender: sender || 'Super Admin',
      createdAt: new Date().toISOString()
    };

    return res.status(201).json({ success: true, message: 'Broadcast directive published successfully.', data: newBroadcast });
  } catch (error) {
    console.warn('[BROADCASTS API] Database insert failed, publishing locally:', error.message);
    const newBroadcast = {
      id: `note_${Date.now()}`,
      title,
      description,
      imageUrl,
      videoUrl,
      targetSchoolId: targetSchoolId || 'all',
      sender: sender || 'Super Admin',
      createdAt: new Date().toISOString()
    };
    mockBroadcasts.unshift(newBroadcast);
    return res.status(201).json({ success: true, isMock: true, message: 'Broadcast directive published locally.', data: newBroadcast });
  }
});

export default router;
