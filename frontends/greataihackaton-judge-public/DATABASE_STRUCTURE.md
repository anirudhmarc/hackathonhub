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

## Judge System Database Usage

The judge system focuses on scoring and evaluation workflows:

### Primary Operations
- **Assignment Viewing**: Read access to Judge_Assignment to see assigned teams
- **Team Information**: Read access to Team, Leader, Problem_Statement for context
- **Scoring**: Full CRUD operations on Score table for team evaluations
- **Submission Review**: Read access to Team_Submission for evaluation materials
- **Stage Management**: Read access to Judging_Stage for current judging phase

### Judge-Specific Access
- Judges can only view and score teams assigned to them via Judge_Assignment
- Scoring is stage-specific and time-controlled via Judging_Stage constraints
- AWS funding votes and detailed feedback are captured in Score records
- Real-time leaderboard access for progress tracking

### Key Constraints
- Judges cannot modify team information or assignments
- Scoring is limited to assigned teams only
- Stage-based access control for preliminary vs final rounds
- Automatic timestamp tracking for audit trails
