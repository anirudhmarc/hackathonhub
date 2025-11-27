# HackHub Infrastructure - Complete Terraform Code

Production-ready, enterprise-grade Terraform infrastructure for the HackHub hackathon platform with 487 AWS resources.

## 🚀 Quick Start

```bash
# 1. Configure your deployment
# Edit terraform.tfvars - update project_name, vpc_cidr, and db_password

# 2. Initialize Terraform
terraform init

# 3. Review planned changes
terraform plan

# 4. Apply infrastructure (creates all 487 resources)
terraform apply -auto-approve

# 5. View outputs
terraform output
```

## ✅ Latest Deployment (Test-8)

**Status**: Successfully deployed with 487 resources
- **Project**: hackhub-test-8
- **VPC CIDR**: 10.8.0.0/16
- **Region**: ap-southeast-2
- **Database**: Initialized with 10 tables + seed data
- **Lambda Functions**: 46 functions deployed
- **Default Password**: hackathonsystem@1A

## 📋 What's Included

This repository contains the **complete production infrastructure** for HackHub:

- ✅ **46 Lambda Functions** with all code included
- ✅ **API Gateway** with 40+ endpoints (admin, judge, participant)
- ✅ **VPC & Networking** with cost-optimized design (no NAT Gateway)
- ✅ **RDS MySQL 8.0.39** with 10 tables (Team, Participant, Judge, Score, etc.)
- ✅ **Cognito** user pools with 3 default users (admin, judge, participant)
- ✅ **DynamoDB** table for participant registrations
- ✅ **S3 + CloudFront** for 3 static portals (admin, judge, participant)
- ✅ **IAM Roles & Policies** with secretsmanager permissions
- ✅ **Security Groups** and encryption at rest/in transit
- ✅ **Database Seeding** with default tracks, problems, judges, and teams

## 📦 Repository Contents

```
terraform-code/
├── main.tf                      # Main infrastructure orchestration
├── variables.tf                 # Input variable definitions
├── outputs.tf                   # Output values (427 resources)
├── terraform.tfvars             # Configuration values
├── provider.tf                  # AWS provider setup
├── data.tf                      # Data sources
├── versions.tf                  # Terraform version constraints
│
├── lambda-code/                 # All 46 Lambda function zip files
│   ├── AdminGetLeaderboardData.zip
│   ├── ApproveParticipant.zip
│   ├── CreateTeam.zip
│   ├── GetParticipantTeams.zip
│   └── ... (42 more functions)
│
├── modules/
│   ├── vpc/                     # VPC and networking
│   ├── rds/                     # MySQL database
│   ├── cognito/                 # User authentication
│   ├── dynamodb/                # NoSQL tables
│   ├── s3_cloudfront/           # Static hosting
│   └── lambda_api/              # Lambda + API Gateway
│       ├── main.tf              # Module orchestration
│       ├── lambda_functions.tf  # 46 Lambda configurations
│       ├── api_routes.tf        # 24 API resource paths
│       ├── api_methods.tf       # 40+ HTTP methods
│       ├── variables.tf         # Module inputs
│       └── outputs.tf           # Module outputs
│
├── env/
│   └── prod/
│       └── terraform.tfvars     # Production configuration
│
└── Documentation/
    ├── QUICKSTART.md            # Fast deployment guide
    ├── DEPLOY.md                # Detailed deployment steps
    ├── LAMBDA_DEPLOYMENT.md     # Lambda-specific guide
    ├── LAMBDA_FUNCTIONS_REFERENCE.md  # All 46 functions documented
    ├── LAMBDA_MODULE_COMPLETE.md      # Module architecture
    ├── VALIDATION_SUMMARY.md    # Validation results
    ├── SECURITY_CHECKLIST.md    # Security verification
    └── SUMMARY.md               # Infrastructure overview
```

## 🏗️ Infrastructure Architecture

### Network Layer (VPC Module)
- **VPC CIDR**: 10.2.0.0/16
- **Public Subnets**: 2 subnets across 2 AZs
- **Private Subnets**: 2 subnets for Lambda functions
- **Database Subnets**: 2 isolated subnets for RDS
- **VPC Endpoints**: S3, DynamoDB, Secrets Manager, SES
- **Cost**: ~$14/month (no NAT Gateway)

### Database Layer (RDS Module)
- **Engine**: MySQL 8.0.39
- **Instance**: db.t3.small (configurable)
- **Storage**: 20GB GP3 with auto-scaling
- **Multi-AZ**: Configurable for HA
- **Backups**: 7-day retention
- **Encryption**: At rest and in transit
- **Tables**: 10 tables (Team, Participant, Judge, Score, Problem_Statement, Track, Leader, Judging_Stage, Judge_Assignment, Submission)
- **Initialization**: Automated via HackhubDbInitializer Lambda
- **Seed Data**: Default tracks, problems, judges, stages, leaders, and teams

### Authentication (Cognito Module)
- **User Pools**: Admin, Judge, Participant
- **MFA**: Optional configuration
- **Password Policy**: Strong requirements
- **Custom Attributes**: Role-based access

### Storage (DynamoDB + S3 Modules)
- **DynamoDB Table**: 
  - Participants table (registration data)
- **S3 Buckets**:
  - Submissions bucket
  - Static hosting buckets (admin, judge, participant)
- **CloudFront**: CDN distributions for all portals

### Compute Layer (Lambda + API Gateway Module)

#### 46 Lambda Functions Organized by Role:

**Admin Functions (15)**
- AdminGetLeaderboardData
- AdminGetParticipants
- AdminGetTeams
- ApproveParticipant
- CreateProblemStatement
- CreateTeam
- CreateTrack
- DeleteAdminParticipants
- DeleteProblemStatement
- DeleteTeam
- DeleteTrack
- GetProblemStatements
- GetTracks
- UpdateProblemStatement
- UpdateTrack

**Judge Functions (6)**
- GetAssignedTeams
- GetJudgeProfile
- GetStudentScore
- GetSubmissionDetails
- SubmitScore
- UpdateJudgeProfile

**Participant Functions (25)**
- CreateParticipant
- CreateSubmission
- DeleteParticipant
- DeleteSubmission
- GetAssignmentId
- GetParticipantProfile
- GetParticipantSubmissions
- GetParticipantTeams
- GetProblemStatementById
- GetProblemStatements
- GetSubmissionById
- GetTeamById
- GetTeamMembers
- GetTeamSubmissions
- GetTracks
- JoinTeam
- LeaveTeam
- SubmitFeedback
- UpdateParticipant
- UpdateParticipantProfile
- UpdateSubmission
- UpdateTeam
- UploadSubmission
- VerifyParticipant
- GetTrackById

#### API Gateway Structure
- **24 Resource Paths**: /admin/*, /judge/*, /participant/*
- **40+ HTTP Methods**: GET, POST, PUT, DELETE
- **CORS**: Enabled on all endpoints
- **Authentication**: Cognito authorizer integration
- **Stage**: prod with deployment

### Security & IAM
- **Lambda Execution Role**: Comprehensive permissions
- **VPC Security Groups**: Lambda and RDS isolation
- **Encryption**: KMS for sensitive data
- **Secrets Manager**: Database credentials
- **Least Privilege**: Scoped IAM policies

## 🔧 Configuration

### Required Variables (terraform.tfvars)

```hcl
# Project Configuration
project_name = "hackhub-test-8"  # Change for each deployment
environment  = "prod"
aws_region   = "ap-southeast-2"

# Network Configuration
vpc_cidr = "10.8.0.0/16"  # Change for each deployment to avoid conflicts
az_count = 2

# Database Configuration
db_name                 = "hackhub"
db_instance_class       = "db.t3.small"
db_allocated_storage    = 20
db_username             = "admin"
db_password             = "JavesonLiu1*"  # Change this!

# Cognito Configuration
admin_email = "tp078851@mail.apu.edu.my"

# Cost Optimization
enable_nat_gateway             = false  # Save $64/month
enable_secretsmanager_endpoint = true   # ~$7/month
enable_ses_endpoint            = true   # ~$7/month

# High Availability (optional)
db_multi_az            = false  # Set true for production
db_deletion_protection = false  # Set true for production
db_skip_final_snapshot = false  # Creates snapshot before deletion
```

### Default User Credentials

After deployment, three default users are created:
- **Admin**: admin@hackhub.com / hackathonsystem@1A
- **Judge**: judge@hackhub.com / hackathonsystem@1A
- **Participant**: participant@hackhub.com / hackathonsystem@1A

## 📊 Resource Summary

Total resources managed: **487**

- VPC & Networking: ~35 resources
- RDS Database: ~15 resources
- Cognito: ~25 resources (including 3 default users)
- DynamoDB: ~10 resources
- S3 & CloudFront: ~45 resources
- Lambda Functions: 46 functions
- API Gateway: ~220 resources
- IAM Roles & Policies: ~60 resources
- Security Groups: ~15 resources
- Database Initialization: 2 resources (init + seed)

## 🚦 Deployment Steps

### 1. Prerequisites
```bash
# Install Terraform
brew install terraform  # macOS
# or download from terraform.io

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: ap-southeast-2
```

### 2. Clone and Configure
```bash
# Navigate to terraform directory
cd greataihackaton-terraform

# Edit configuration
nano terraform.tfvars
# IMPORTANT: Update these values for each deployment:
# - project_name (e.g., hackhub-test-9)
# - vpc_cidr (e.g., 10.9.0.0/16)
# - db_password (use a strong password)
# - admin_email
```

### 3. Clean State (if redeploying)
```bash
# If you've cleaned tfstate and want fresh deployment
rm -f terraform.tfstate*
```

### 4. Initialize Terraform
```bash
terraform init
```

### 5. Plan Deployment
```bash
terraform plan

# Review the plan carefully
# Should show: Plan: 487 to add, 0 to change, 0 to destroy
```

### 6. Deploy Infrastructure
```bash
terraform apply -auto-approve

# This will take 15-20 minutes
# Creates all 487 resources including:
# - VPC and networking
# - RDS database with 10 tables
# - 46 Lambda functions
# - API Gateway with 40+ endpoints
# - Cognito with 3 default users
# - S3 + CloudFront for 3 portals
# - Database seed data
```

### 7. Verify Deployment
```bash
# View all outputs
terraform output

# Get portal URLs
terraform output admin_portal_url
terraform output judge_portal_url
terraform output participant_portal_url

# Test database initialization
terraform output db_initialization_status
terraform output db_seed_status
```

## 📤 Important Outputs

After deployment, you'll get:

```hcl
# Portal URLs (CloudFront)
admin_portal_url       = "https://d1ybea23orymb6.cloudfront.net"
judge_portal_url       = "https://d3hqe4ol2ss6yy.cloudfront.net"
participant_portal_url = "https://dz9epocvjrry.cloudfront.net"

# API Gateway
api_gateway_url = "https://9117gpcjvd.execute-api.ap-southeast-2.amazonaws.com/prod"
api_gateway_id  = "9117gpcjvd"

# Cognito
cognito_user_pool_id     = "ap-southeast-2_q2aeODOfX"
cognito_identity_pool_id = "ap-southeast-2:e6e9f7e8-189d-48cf-ba48-03b190bd3b58"
cognito_domain_url       = "https://hackhub-test-8-prod-giz4tc5e.auth.ap-southeast-2.amazoncognito.com"

# Database
rds_endpoint    = "hackhub-test-8-prod-db.c12qucwowj9e.ap-southeast-2.rds.amazonaws.com:3306"
rds_address     = "hackhub-test-8-prod-db.c12qucwowj9e.ap-southeast-2.rds.amazonaws.com"
db_secret_arn   = "arn:aws:secretsmanager:ap-southeast-2:757834573545:secret:hackhub-test-8-prod-db-..."

# Database Status
db_initialization_status = "Database initialized successfully"
db_seed_status          = "Default data inserted successfully"

# Storage
submissions_bucket_name  = "hackhub-test-8-prod-submissions-gv9ox6ds"
participants_table_name  = "hackhub-test-8-prod-participants"

# Network
vpc_id             = "vpc-06328650d11a40e5f"
vpc_cidr           = "10.8.0.0/16"
private_subnet_ids = ["subnet-05a5fe666afcb0880", "subnet-0f13c34239ee135b7"]

# Lambda
lambda_function_count = 46
lambda_functions      = [list of all 46 function names]
```

## 🔒 Security Best Practices

### Before Production Deployment

1. **Change Default Password**
   ```hcl
   db_password = "use-a-strong-random-password-here"
   ```

2. **Enable Protection**
   ```hcl
   db_deletion_protection = true
   db_multi_az           = true
   ```

3. **Review IAM Policies**
   - Check `modules/lambda_api/main.tf`
   - Verify least privilege access

4. **Enable Encryption**
   - Already enabled for RDS, S3, DynamoDB
   - Verify KMS key configuration

5. **Configure Backups**
   - RDS: 7-day retention (configurable)
   - S3: Versioning enabled
   - DynamoDB: Point-in-time recovery

### Security Checklist

See `SECURITY_CHECKLIST.md` for comprehensive security verification.

## 💰 Cost Estimation

### Monthly Costs (Approximate)

- **VPC Endpoints**: $14/month
- **RDS db.t3.small**: $30/month
- **Lambda**: $0-5/month (depends on usage)
- **API Gateway**: $3.50 per million requests
- **S3**: $0.023 per GB
- **CloudFront**: $0.085 per GB
- **DynamoDB**: Pay per request
- **Cognito**: Free tier (50,000 MAUs)

**Estimated Total**: $45-65/month for low-medium traffic

### Cost Optimization Tips

1. **No NAT Gateway**: Saves $64/month
2. **Use VPC Endpoints**: Gateway endpoints are FREE
3. **Right-size RDS**: db.t3.small with auto-scaling storage
4. **Lambda Memory**: Optimized at 256MB
5. **S3 Lifecycle**: Archive old submissions
6. **CloudFront**: Use caching effectively

## 🔄 Updates and Maintenance

### Update Lambda Function Code
```bash
# Update zip file in lambda-code/
# Then apply changes
terraform apply -target=module.lambda_api.aws_lambda_function.function_name
```

### Update API Gateway
```bash
# Changes to api_routes.tf or api_methods.tf
terraform apply -target=module.lambda_api
```

### Database Migrations
```bash
# Connect to RDS
mysql -h $(terraform output -raw rds_endpoint | cut -d: -f1) \
      -u admin -p

# Run migrations
source database-schema.sql
```

### Scale Resources
```bash
# Edit terraform.tfvars
db_instance_class = "db.t3.small"  # Upgrade

# Apply changes
terraform apply
```

## 🧪 Testing

### Validate Configuration
```bash
./validate-terraform.sh
```

### Test Lambda Functions
```bash
# Invoke a function
aws lambda invoke \
  --function-name hackhub-prod-GetTracks \
  --region ap-southeast-1 \
  response.json

cat response.json
```

### Test API Endpoints
```bash
# Get API URL
API_URL=$(terraform output -raw api_gateway_url)

# Test public endpoint
curl $API_URL/participant/tracks

# Test authenticated endpoint (requires token)
curl -H "Authorization: Bearer $TOKEN" \
     $API_URL/participant/profile
```

## 📚 Additional Documentation

- **QUICKSTART.md**: Fast deployment guide
- **DEPLOY.md**: Detailed deployment instructions
- **LAMBDA_DEPLOYMENT.md**: Lambda-specific deployment
- **LAMBDA_FUNCTIONS_REFERENCE.md**: All 46 functions documented
- **LAMBDA_MODULE_COMPLETE.md**: Module architecture details
- **VALIDATION_SUMMARY.md**: Validation test results
- **SECURITY_CHECKLIST.md**: Security verification steps
- **SUMMARY.md**: Infrastructure overview

## 🐛 Troubleshooting

### Common Issues

**Issue**: Terraform init fails
```bash
# Solution: Check AWS credentials
aws sts get-caller-identity
```

**Issue**: DB subnet group already exists
```bash
# This was fixed in the code - RDS module no longer creates duplicate subnet group
# The VPC module creates it, RDS module uses it via variable
# If you still see this error, delete the existing subnet group:
aws rds delete-db-subnet-group --db-subnet-group-name hackhub-test-X-prod-db-subnet-group
```

**Issue**: Lambda functions can't connect to RDS
```bash
# Solution: Verify security groups allow traffic
terraform output lambda_security_group_id
terraform output rds_security_group_id
# Check that RDS security group allows inbound from Lambda security group on port 3306
```

**Issue**: API Gateway returns 403
```bash
# Solution: Check Cognito configuration and user pool
terraform output cognito_user_pool_id
# Verify user exists and is in correct group
```

**Issue**: Database initialization failed
```bash
# Solution: Check HackhubDbInitializer Lambda logs
aws logs tail /aws/lambda/hackhub-test-8-prod-HackhubDbInitializer --follow

# Re-run initialization
terraform apply -replace=null_resource.db_init_trigger
```

**Issue**: Portal shows blank page
```bash
# Solution: Check CloudFront distribution and S3 bucket
terraform output admin_portal_url
# Verify files were uploaded to S3 bucket
aws s3 ls s3://$(terraform output -raw submissions_bucket_name)
```

## 🔄 State Management

### Local State (Current)
State is stored locally in `terraform.tfstate`

### Remote State (Recommended for Production)

1. Create S3 bucket:
```bash
aws s3 mb s3://hackhub-terraform-state-prod --region ap-southeast-1
```

2. Create DynamoDB table:
```bash
aws dynamodb create-table \
  --table-name hackhub-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

3. Add backend to `versions.tf`:
```hcl
terraform {
  backend "s3" {
    bucket         = "hackhub-terraform-state-prod"
    key            = "terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "hackhub-terraform-lock"
    encrypt        = true
  }
}
```

4. Migrate state:
```bash
terraform init -migrate-state
```

## 🤝 Contributing

When making changes:

1. Create a new branch
2. Make changes to .tf files
3. Run `terraform fmt`
4. Run `terraform validate`
5. Test with `terraform plan`
6. Commit and push

## 📞 Support

For issues or questions:
- Check documentation in this repository
- Review AWS CloudWatch logs
- Check Lambda function logs
- Verify security group rules

## 📄 License

This infrastructure code is part of the HackHub platform.

## 🎯 Next Steps

After deployment:

1. **Access Portals**: Use the CloudFront URLs from outputs
2. **Login**: Use default credentials (admin@hackhub.com / hackathonsystem@1A)
3. **Verify Database**: Check that all 10 tables exist with seed data
4. **Test API**: Use Postman or curl to test endpoints
5. **Upload Frontend**: Deploy React apps to S3 buckets if needed
6. **Configure DNS**: Point custom domains to CloudFront (optional)
7. **Monitor**: Check CloudWatch logs for Lambda functions
8. **Backup**: Verify RDS automated backups are enabled

### Database Tables Created

The deployment automatically creates these tables:
- Team (with is_finalist column)
- Participant
- Judge
- Score (with stage_id column)
- Problem_Statement
- Track
- Leader
- Judging_Stage (new table)
- Judge_Assignment (new table)
- Submission

### Default Seed Data

- 2 Tracks: "Student Track", "Corporate Track"
- 2 Problem Statements
- 2 Judges
- 2 Judging Stages: "Initial Review", "Final Round"
- 2 Leaders
- 2 Teams: "AI Innovators", "Cloud Masters"

---

**Repository**: https://github.com/javesonfrancoisliu/hackathon-system.git

**Last Updated**: November 2025

**Terraform Version**: >= 1.5.0

**AWS Provider Version**: >= 5.0

**Latest Deployment**: Test-8 (487 resources)
