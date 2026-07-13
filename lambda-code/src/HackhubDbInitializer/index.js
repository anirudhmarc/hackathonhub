const mysql = require('mysql2/promise');
// AWS SDK v3 is built into the nodejs22.x runtime — no bundling of aws-sdk v2 needed.
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secretsManager = new SecretsManagerClient({ region: process.env.REGION || process.env.AWS_REGION || 'us-east-1' });

const DDL_SCRIPT = `USE hackhub;
DROP TABLE IF EXISTS Score;
DROP TABLE IF EXISTS Judge_Assignment;
DROP TABLE IF EXISTS Team_Submission;
DROP TABLE IF EXISTS Team;
DROP TABLE IF EXISTS Leader;
DROP TABLE IF EXISTS Problem_Statement;
DROP TABLE IF EXISTS Judge;
DROP TABLE IF EXISTS Judging_Stage;
DROP TABLE IF EXISTS Hackathon_Membership;
DROP TABLE IF EXISTS Track;
DROP TABLE IF EXISTS Hackathon;

-- ============================================================================
-- MULTI-TENANT SCHEMA
-- Every tenant-scoped table carries hackathon_id (FK -> Hackathon). Hackathon
-- is created FIRST so children can reference it. Hackathon now carries the
-- per-event timeline that used to live in build-time VITE_* env constants.
-- ============================================================================

CREATE TABLE IF NOT EXISTS Hackathon (
    hackathon_id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    hackathon_start DATETIME,
    hackathon_end DATETIME,
    problems_selection_start DATETIME,
    problems_selection_end DATETIME,
    submission_start DATETIME,
    submission_end DATETIME,
    final_submission_start DATETIME,
    final_submission_end DATETIME,
    scoring_start DATETIME,
    scoring_end DATETIME,
    scoring_lock DATETIME,
    feedback_release DATETIME,
    finalists_announcement DATETIME,
    winners_announcement DATETIME,
    logo_url VARCHAR(512),
    is_problem_statement_selection_enabled BOOLEAN NOT NULL DEFAULT 1,
    is_team_submission_enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hackathon_owner (owner_email)
);

-- Maps a user (by email) to a hackathon with a role. A user may belong to many
-- hackathons and hold different roles in each. Platform Admins bypass this table.
CREATE TABLE IF NOT EXISTS Hackathon_Membership (
    membership_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    UNIQUE KEY uq_membership (hackathon_id, email_address, role),
    INDEX idx_membership_lookup (hackathon_id, email_address)
);

CREATE TABLE IF NOT EXISTS Track (
    track_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    track_title VARCHAR(255) NOT NULL,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    INDEX idx_track_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Problem_Statement (
    problem_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    problem_title VARCHAR(255) NOT NULL,
    problem_description TEXT NOT NULL,
    problem_tag VARCHAR(50),
    problem_max_slots INT NOT NULL,
    track_id VARCHAR(50) NOT NULL,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (track_id) REFERENCES Track(track_id),
    INDEX idx_problem_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Judge (
    judge_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    judge_name VARCHAR(255) NOT NULL,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    UNIQUE KEY uq_judge_email (hackathon_id, email_address),
    INDEX idx_judge_hackathon (hackathon_id, email_address)
);

CREATE TABLE IF NOT EXISTS Leader (
    leader_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    track_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36),
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (track_id) REFERENCES Track(track_id),
    INDEX idx_leader_hackathon (hackathon_id, email_address)
);

CREATE TABLE IF NOT EXISTS Team (
    team_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    leader_id VARCHAR(36) NOT NULL,
    problem_id VARCHAR(36),
    team_name VARCHAR(255) NOT NULL,
    problem_selection_id VARCHAR(36),
    is_finalist TINYINT(1) DEFAULT 0,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (leader_id) REFERENCES Leader(leader_id),
    FOREIGN KEY (problem_id) REFERENCES Problem_Statement(problem_id),
    INDEX idx_team_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Judging_Stage (
    stage_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time DATETIME,
    end_time DATETIME,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    INDEX idx_stage_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Judge_Assignment (
    assignment_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    judge_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    stage_id VARCHAR(36) NOT NULL,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (judge_id) REFERENCES Judge(judge_id),
    FOREIGN KEY (team_id) REFERENCES Team(team_id),
    FOREIGN KEY (stage_id) REFERENCES Judging_Stage(stage_id),
    INDEX idx_assignment_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Team_Submission (
    submission_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    last_updated DATETIME NOT NULL,
    submission_video_url VARCHAR(255) NOT NULL,
    github_url VARCHAR(255) NOT NULL,
    submission_project_description TEXT NOT NULL,
    submission_additional_materials_url TEXT,
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (team_id) REFERENCES Team(team_id),
    INDEX idx_submission_hackathon (hackathon_id)
);

CREATE TABLE IF NOT EXISTS Score (
    score_id VARCHAR(36) PRIMARY KEY,
    hackathon_id VARCHAR(36) NOT NULL,
    team_id VARCHAR(36) NOT NULL,
    judge_id VARCHAR(36) NOT NULL,
    innovation INT NOT NULL,
    technical_complexity INT NOT NULL,
    impact INT NOT NULL,
    presentation INT NOT NULL,
    feedback TEXT,
    strength TEXT,
    improvement TEXT,
    last_updated DATETIME NOT NULL,
    stage_id VARCHAR(36),
    FOREIGN KEY (hackathon_id) REFERENCES Hackathon(hackathon_id),
    FOREIGN KEY (team_id) REFERENCES Team(team_id),
    FOREIGN KEY (judge_id) REFERENCES Judge(judge_id),
    FOREIGN KEY (stage_id) REFERENCES Judging_Stage(stage_id),
    INDEX idx_score_hackathon (hackathon_id)
);`;

async function getDbCredentials() {
    const data = await secretsManager.send(new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN }));
    return JSON.parse(data.SecretString);
}

exports.handler = async (event) => {
    let connection;
    try {
        const creds = await getDbCredentials();
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: creds.username,
            password: creds.password,
            port: parseInt(process.env.DB_PORT || '3306', 10)
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE}`);
        await connection.query(`USE ${process.env.DB_DATABASE}`);
        // Disable FK checks so DROP/CREATE ordering and any leftover constraints
        // from a prior (partial) migration can't block a clean rebuild.
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        // Strip full-line SQL comments, then split into statements.
        const cleaned = DDL_SCRIPT
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');
        const statements = cleaned.split(';').filter(s => s.trim());
        for (const stmt of statements) {
            if (stmt.trim()) await connection.query(stmt);
        }
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        return { statusCode: 200, body: JSON.stringify({ message: 'Database schema created successfully!' }) };
    } catch (error) {
        console.error('Error:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Failed to create database schema', error: error.message }) };
    } finally {
        if (connection) await connection.end();
    }
};
