-- SQL schema for Community Issue Reporting & Tracking System 

-- 1. WARDS TABLE (Unchanged, tracking performance per ward)
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. ISSUES TABLE (Hardened with Duplicate Links & DPDP Consent metrics)
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'sanitation', 'infrastructure', 'encroachment', 'public-safety'
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    image_url TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    ward_id INTEGER REFERENCES wards(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'duplicate')), 
    sla_deadline TIMESTAMP NOT NULL,
    resolution_proof_url TEXT,
    parent_issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
    has_citizen_consent BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP,
    privacy_policy_version VARCHAR(10) DEFAULT 'v1.0',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS issue_logs (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    action_by VARCHAR(100) DEFAULT 'SYSTEM',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO wards (name, pincode) VALUES 
('Ward 1 - Central Zone', '400001'),
('Ward 2 - West Zone', '400002'),
('Ward 3 - North Zone', '400003')
ON CONFLICT DO NOTHING;