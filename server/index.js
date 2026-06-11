const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {z} = require('zod');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'fallback_12345';

app.use(helmet());//Mitigates XSS (Security Feature)
app.use(cors());
app.use(express.json({limit: '10kb'}));//Reduce massive payload coming from user

//zod validation allows only normal data and not malicious data 
const issueSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10).max(2000),
  category: z.enum(['sanitation','infrastructure','encroachment','public-safety']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  image_url: z.string().url().optional().or(z.literal('').optional()),
  is_anonymous: z.boolean().default(false),
  ward_id: z.string().or(z.number())
});

const updateSchema = z.object({
  status: z.enum(['open','in_progress','resolved']),
  resolution_proof_url: z.string().url().optional().or(z.literal('').optional())
});

const authenticate = (req,res,next) => {
  try{
    const header = req.headers.authorization;
    if(!header || !header.startsWith('Bearer ')){
      return res.status(401).json({error: "Access Denied: Missing credentials."});
    }
    const token = header.split(' ')[1];
    req.user = jwt.verify(token,JWT_SECRET);
    next();
  }
  catch(error){
    return res.status(401).json({error: "Invalid or expired session token"});
  }
}

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
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const result = await db.query(`
      SELECT i.*, w.name as ward_name 
      FROM issues i 
      LEFT JOIN wards w ON i.ward_id = w.id 
      ORDER BY i.created_at DESC
      LIMIT $1, OFFSET $2
    `,[limit,offset]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/issues', async (req, res) => {
  try{
    const validated = issueSchema.parse(req.body);
    // Calculate SLA deadline
    const slaHours = SLA_CONFIG[validated.category] || 48;
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + slaHours);

    const insertQuery = `
      INSERT INTO issues (title,description,category,latitude,longitude,image_url, is_anonymous,ward_id, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8, $9) 
      RETURNING *;
    `;
    
    const values = [
      validated.title,validated.description,validated.category,validated.latitude,validated.longitude,validated.image_url || null,validated.is_anonymous,validated.ward_id,slaDeadline
    ];

    const newIssue = await db.query(insertQuery, values);

    res.status(201).json({
      message: "Issue reported successfully",
      issue: newIssue.rows[0]
    });
  }
  catch(err){
    if(err instanceof z.ZodError){
      return res.status(400).json({error: "Validation failed",details: err.errors});
    }
    console.error("Error serving issue:",err.message);
    res.status(500).json({error: "Internal Server Error"})
  }
});

// Update issue status (Admin)
app.patch('/api/issues/:id',authenticate, async (req, res) => {
  const { id } = req.params;
  const validated = updateSchema.parse(req.body);
  try {
    const result = await db.query(
      'UPDATE issues SET status = $1,resolution_proof_url = $2,updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [validated.status,validated.resolution_proof_url || null,id]
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
