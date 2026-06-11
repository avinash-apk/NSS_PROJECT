const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {z} = require('zod');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'fallback_12345';

app.use(helmet());//Mitigates XSS (Security Feature)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({limit: '10kb'}));//Reduce massive payload coming from user

//Rate limiting
const limiter = rateLimit({
  windowMs: 15*60*1000, // 15 minutes
  max: 100,//100 requests per 15 minutes for one ip
  standardHeaders: true,
  legacyHeaders: false,
  message: {error:'Too many requests from this IP, please try again after 15 minutes'}
});

// Apply rate limiting to all requests
app.use(limiter);

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
  status: z.enum(['open','in_progress','resolved','escalated','duplicate']),
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

// Dev-only mock login endpoint — generates a valid JWT for testing
app.post('/api/mock-login', (req, res) => {
  const token = jwt.sign(
    {id: 1, role: 'admin', email: 'admin@civicconnect.dev' },
    JWT_SECRET,
    {expiresIn: '24h'}
  );
  res.json({ token, message: 'Dev token issued. Use in Authorization: Bearer <token> header.' });
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
      LIMIT $1 OFFSET $2
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

// Update issue status (Admin) — with audit trail
app.patch('/api/issues/:id',authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const validated = updateSchema.parse(req.body);
    const current = await db.query('SELECT status FROM issues WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    const previousStatus = current.rows[0].status;
    const result = await db.query(
      'UPDATE issues SET status = $1,resolution_proof_url = $2,updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [validated.status,validated.resolution_proof_url || null,id]
    );
    await db.query(
      'INSERT INTO issue_logs (issue_id, previous_status, new_status, action_by, remarks) VALUES ($1, $2, $3, $4, $5)',
      [id, previousStatus, validated.status, req.user.email || 'admin', `Status changed from ${previousStatus} to ${validated.status}`]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if(err instanceof z.ZodError){
      return res.status(400).json({error: "Validation failed",details: err.errors});
    }
    res.status(500).json({ error: err.message });
  }
});

// Get audit trail for a specific issue
app.get('/api/issues/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'SELECT * FROM issue_logs WHERE issue_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated,
        COUNT(*) FILTER (WHERE sla_deadline < NOW() AND status NOT IN ('resolved','duplicate')) as sla_breached
      FROM issues
    `);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Automated SLA Escalation Engine
const runSLAEscalation = async () => {
  try {
    const overdue = await db.query(`
      SELECT id, status FROM issues 
      WHERE sla_deadline < NOW() 
      AND status IN ('open', 'in_progress')
    `);
    
    for (const issue of overdue.rows) {
      await db.query(
        'UPDATE issues SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['escalated', issue.id]
      );
      await db.query(
        'INSERT INTO issue_logs (issue_id, previous_status, new_status, action_by, remarks) VALUES ($1, $2, $3, $4, $5)',
        [issue.id, issue.status, 'escalated', 'SYSTEM', 'Auto-escalated: SLA deadline breached']
      );
    }
    
    if (overdue.rows.length > 0) {
      console.log(`[SLA Engine] Auto-escalated ${overdue.rows.length} overdue issue(s)`);
    }
  } catch (err) {
    console.error('[SLA Engine] Error:', err.message);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setInterval(runSLAEscalation,5*60*1000);
  runSLAEscalation();
});
