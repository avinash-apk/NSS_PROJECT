const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// SLA logic per issue type (in hours)
const SLA_CONFIG = {
  'sanitation': 24,
  'infrastructure': 72,
  'encroachment': 48,
  'public-safety': 12
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'PROJECT Backend Active', timestamp: new Date() });
});

// Get all wards
app.get('/api/wards', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM wards ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all issues (with ward name)
app.get('/api/issues', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*, w.name as ward_name 
      FROM issues i 
      LEFT JOIN wards w ON i.ward_id = w.id 
      ORDER BY i.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/issues', async (req, res) => {
  try{
    const{title,description,category,latitude,longitude,image_url,is_anonymous,ward_id} = req.body;
    if(!title || !description || !category || !latitude || !longitude || !ward_id) {
      return res.status(400).json({ error: "Missing required fields for submission." });
    }

    // Calculate SLA deadline
    const slaHours = SLA_CONFIG[category] || 48;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const insertQuery = `
      INSERT INTO issues (title,description,category,latitude,longitude,image_url, is_anonymous,ward_id, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9) 
      RETURNING *;
    `;
    const values = [title,description,category,latitude,longitude,image_url,is_anonymous,ward_id, slaDeadline];
    const newIssue = await db.query(insertQuery, values);
    res.status(201).json({
      message: "Issue reported successfully",
      issue: newIssue.rows[0]
    });
  }
  catch(err){
    console.error("Error saving issue:",err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update issue status (Admin)
app.patch('/api/issues/:id', async (req, res) => {
  const { id } = req.params;
  const { status, resolution_proof_url } = req.body;
  try {
    const result = await db.query(
      'UPDATE issues SET status = $1, resolution_proof_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, resolution_proof_url, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
