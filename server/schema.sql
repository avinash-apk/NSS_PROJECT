-- SQL schema for Community Issue Reporting & Tracking System 

-- 1. WARDS TABLE
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS TABLE (Keeps email strictly for Admin Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Holds secure salted hashes
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ISSUES TABLE (Cleaned of citizen emails, hardened for production performance)
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
    sla_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    resolution_proof_url TEXT,
    parent_issue_id INTEGER REFERENCES issues(id) ON DELETE SET NULL,
    has_citizen_consent BOOLEAN DEFAULT FALSE,
    consent_timestamp TIMESTAMP WITH TIME ZONE,
    privacy_policy_version VARCHAR(10) DEFAULT 'v1.0',
    is_escalated_by_citizen BOOLEAN DEFAULT FALSE,
    citizen_escalation_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. ISSUE LOGS (Audit trail for status tracking)
CREATE TABLE IF NOT EXISTS issue_logs (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    action_by VARCHAR(100) DEFAULT 'SYSTEM',
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Optimizes background SLA Escalation Engine (runs every 5 minutes)
CREATE INDEX IF NOT EXISTS idx_issues_sla_active 
ON issues (sla_deadline) 
WHERE status IN ('open', 'in_progress');

-- Optimizes backend Duplicate Check verification during new submissions
CREATE INDEX IF NOT EXISTS idx_issues_duplicate_check 
ON issues (title, ward_id) 
WHERE status NOT IN ('resolved', 'duplicate');

-- Optimizes admin dashboards and relationship lookup counts
CREATE INDEX IF NOT EXISTS idx_issues_ward_id ON issues(ward_id);
CREATE INDEX IF NOT EXISTS idx_issue_logs_issue_id ON issue_logs(issue_id);

-- =========================================================================
-- TRIGGER ENGINE (Fixes the frozen updated_at bug automatically)
-- =========================================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_issues_modtime
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE PROCEDURE update_modified_column();


INSERT INTO wards (name, pincode) VALUES 
('Ward 1 - Central Zone', '400001'),
('Ward 2 - West Zone', '400002'),
('Ward 3 - North Zone', '400003')
ON CONFLICT DO NOTHING;