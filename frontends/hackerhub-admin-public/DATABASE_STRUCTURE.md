# Database Schema Structure

## Tables Overview

### 1. **Hackathon**

- `hackathon_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `hackathon_start` (datetime, NOT NULL)
- `hackathon_end` (datetime, NOT NULL)
- `is_problem_statement_selection_enabled` (tinyint(1), NOT NULL)
- `is_team_submission_enabled` (tinyint(1), NOT NULL)

### 2. **Track**

- `track_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `track_title` (varchar(255), NOT NULL)

### 3. **Problem_Statement**

- `problem_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `problem_title` (varchar(255), NOT NULL)
- `problem_description` (text, NOT NULL)
- `problem_tag` (varchar(50), NULLABLE)
- `problem_max_slots` (int, NOT NULL)
- `track_id` (varchar(50), FOREIGN KEY → Track.track_id, NOT NULL)

### 4. **Team**

- `team_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `leader_id` (varchar(36), FOREIGN KEY → Leader.leader_id, NOT NULL)
- `problem_id` (varchar(36), FOREIGN KEY → Problem_Statement.problem_id, **NULLABLE**)
- `team_name` (varchar(255), NOT NULL)
- `problem_selection_id` (varchar(36), NULLABLE)
- `is_finalist` (tinyint(1), NULLABLE, DEFAULT: 0)

### 5. **Leader**

- `leader_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `email_address` (varchar(255), NOT NULL)
- `track_id` (varchar(36), FOREIGN KEY → Track.track_id, NOT NULL)

### 6. **Judge**

- `judge_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `email_address` (varchar(255), UNIQUE, NOT NULL)
- `judge_name` (varchar(255), NOT NULL)

### 7. **Judging_Stage**

- `stage_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `stage_name` (varchar(255), NOT NULL)
- `description` (text, NULLABLE)
- `start_time` (datetime, NULLABLE)
- `end_time` (datetime, NULLABLE)

### 8. **Judge_Assignment**

- `assignment_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `judge_id` (varchar(36), FOREIGN KEY → Judge.judge_id, NOT NULL)
- `team_id` (varchar(36), FOREIGN KEY → Team.team_id, NOT NULL)
- `assigned_at` (datetime, NULLABLE, DEFAULT: CURRENT_TIMESTAMP)
- `stage_id` (varchar(36), FOREIGN KEY → Judging_Stage.stage_id, NOT NULL)

### 9. **Score**

- `score_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `team_id` (varchar(36), FOREIGN KEY → Team.team_id, NOT NULL)
- `judge_id` (varchar(36), FOREIGN KEY → Judge.judge_id, NOT NULL)
- `innovation` (int, NOT NULL)
- `technical_complexity` (int, NOT NULL)
- `impact` (int, NOT NULL)
- `presentation` (int, NOT NULL)
- `aws_funding_vote` (varchar(10), NULLABLE) - 'upvote'/'downvote'
- `feedback` (text, NULLABLE)
- `strength` (text, NULLABLE)
- `improvement` (text, NULLABLE)
- `last_updated` (datetime, NOT NULL)
- `stage_id` (varchar(36), FOREIGN KEY → Judging_Stage.stage_id, NULLABLE)

### 10. **Team_Submission**

- `submission_id` (varchar(36), PRIMARY KEY, NOT NULL)
- `team_id` (varchar(36), FOREIGN KEY → Team.team_id, NOT NULL)
- `last_updated` (datetime, NOT NULL)
- `submission_video_url` (varchar(255), NOT NULL)
- `github_url` (varchar(255), NOT NULL)
- `submission_project_description` (text, NOT NULL)
- `submission_additional_materials_url` (text, NULLABLE)

---

## Admin System Database Usage

The admin system primarily interacts with all tables for comprehensive hackathon management:

### Core Operations
- **Team Management**: Full CRUD operations on Team, Leader tables
- **Judge Management**: Complete judge lifecycle in Judge, Judge_Assignment tables
- **Problem Management**: Problem_Statement creation and track assignment
- **Scoring Oversight**: Read access to Score table for leaderboard generation
- **Participant Management**: Leader registration and team creation workflow

### Key Relationships
- Teams are linked to Leaders and optionally to Problem_Statements
- Judges are assigned to Teams through Judge_Assignment table
- Scores are tracked per Team-Judge-Stage combination
- Submissions are linked to Teams for review and evaluation
