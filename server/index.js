const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'PROJECT Backend Active', timestamp: new Date() });
});

app.post('/api/issues', async (req, res) => {
  try{
    const{title,description,category,latitude,longitude,image_url,is_anonymous,ward_id} = req.body;
    if(!title || !description || !category || !latitude || !longitude || !ward_id) {
      return res.status(400).json({ error: "Missing required fields for submission." });
    }
    const insertQuery = `
      INSERT INTO issues (title,description,category,latitude,longitude,image_url, is_anonymous,ward_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) 
      RETURNING *;
    `;
    const values = [title,description,category,latitude,longitude,image_url,is_anonymous,ward_id];
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
