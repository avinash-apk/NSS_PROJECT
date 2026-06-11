-- SQL schema for Community Issue Reporting & Tracking System

-- Wards table to track performance per ward
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- sanitation, infrastructure, encroachment, public-safety
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    image_url TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    ward_id INTEGER REFERENCES wards(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, in-progress, resolved, escalated
    sla_deadline TIMESTAMP,
    resolution_proof_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed some wards
INSERT INTO wards (name, pincode) VALUES 
('Ward 1 - Central', '400001'),
('Ward 2 - West', '400002'),
('Ward 3 - North', '400003')
ON CONFLICT DO NOTHING;
