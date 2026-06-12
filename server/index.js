const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const {z} = require('zod');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'fallback_12345';

// Password hashing helper
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({limit: '10kb'}));

const limiter = rateLimit({
  windowMs: 15*60*1000, 
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {error:'Too many requests from this IP, please try again after 15 minutes'}
});

app.use(limiter);

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

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
  resolution_proof_url: z.string().url().optional().or(z.literal('').optional()),
  parent_issue_id: z.number().optional().nullable()
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
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Access Denied: Admins only." });
  }
};

const SLA_CONFIG = {
  'sanitation': 24,
  'infrastructure': 72,
  'encroachment': 48,
  'public-safety': 12
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'PROJECT Backend Active', timestamp: new Date() });
});

// Real Auth Endpoints
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);
    const hashedPassword = hashPassword(password);
    
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, 'admin']
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already registered' });
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || [];
      const errorMsg = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ error: `Validation failed: ${errorMsg}`, details: issues });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const hashedPassword = hashPassword(password);
    
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, hashedPassword]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    
    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || err.errors || [];
      const errorMsg = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ error: `Validation failed: ${errorMsg}`, details: issues });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/wards', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM wards ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
    
    // Duplicate Check
    const existing = await db.query(
      'SELECT id FROM issues WHERE title = $1 AND ward_id = $2 AND status NOT IN (\'resolved\', \'duplicate\')',
      [validated.title, validated.ward_id]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'This issue has already been reported and is currently active.' });
    }

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
      const issues = err.issues || err.errors || [];
      const errorMsg = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({error: `Validation failed: ${errorMsg}`, details: issues});
    }
    console.error("Error serving issue:",err.message);
    res.status(500).json({error: "Internal Server Error"})
  }
});

// Escalate issue (Citizen) - Only after 1 day
app.post('/api/issues/:id/escalate', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT created_at, status FROM issues WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    
    const issue = result.rows[0];
    const createdAt = new Date(issue.created_at);
    const now = new Date();
    const oneDayInMs = 24 * 60 * 60 * 1000;
    
    if (now.getTime() - createdAt.getTime() < oneDayInMs) {
      return res.status(400).json({ error: 'You can only escalate an issue 24 hours after it was reported.' });
    }
    
    if (issue.status === 'resolved' || issue.status === 'escalated') {
      return res.status(400).json({ error: `Issue is already ${issue.status}.` });
    }
    
    await db.query(
      'UPDATE issues SET status = $1, is_escalated_by_citizen = TRUE, citizen_escalation_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['escalated', id]
    );
    
    await db.query(
      'INSERT INTO issue_logs (issue_id, previous_status, new_status, action_by, remarks) VALUES ($1, $2, $3, $4, $5)',
      [id, issue.status, 'escalated', 'CITIZEN', 'Manually escalated by citizen']
    );
    
    res.json({ message: 'Issue escalated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/issues/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const validated = updateSchema.parse(req.body);
    const current = await db.query('SELECT status FROM issues WHERE id = $1', [id]);
    if (current.rows.length === 0) return res.status(404).json({ error: 'Issue not found' });
    
    const previousStatus = current.rows[0].status;
    const updateQuery = `
      UPDATE issues 
      SET status = $1, 
          resolution_proof_url = $2, 
          parent_issue_id = $3,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = $4 
      RETURNING *
    `;
    const result = await db.query(updateQuery, [
      validated.status,
      validated.resolution_proof_url || null,
      validated.parent_issue_id !== undefined ? validated.parent_issue_id : null,
      id
    ]);

    await db.query(
      'INSERT INTO issue_logs (issue_id, previous_status, new_status, action_by, remarks) VALUES ($1, $2, $3, $4, $5)',
      [
        id, 
        previousStatus, 
        validated.status, 
        req.user.email || 'admin', 
        `Status changed from ${previousStatus} to ${validated.status}${validated.parent_issue_id ? ` (Linked to #${validated.parent_issue_id})` : ''}`
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if(err instanceof z.ZodError){
      const issues = err.issues || err.errors || [];
      const errorMsg = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({error: `Validation failed: ${errorMsg}`, details: issues});
    }
    console.error("Error updating issue:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
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
