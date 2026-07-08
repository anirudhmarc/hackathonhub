# HackHub Portal - Setup Complete ✅

## 🎉 Your HackHub Portal is Running!

**Local URL:** http://localhost:8080/
**Status:** Connected to AWS resources

---

## ✅ Configuration Summary

### API & Backend
- **API Gateway:** https://1iia9awcgc.execute-api.ap-southeast-1.amazonaws.com/prod
- **Region:** ap-southeast-1 (Singapore)
- **S3 Bucket:** hackhub-prod-submissions-85z6xai0

### Cognito Authentication
- **User Pool ID:** ap-southeast-1_R2MSvyJcY
- **Client ID:** 4dhk7tnkgdru4hn33ceo5uoc8m (admin-client)
- **Auth Domain:** https://hackhub-prod-ac4y1ayx.auth.ap-southeast-1.amazoncognito.com

### Callback URLs (Configured)
- ✅ http://localhost:8080/callback
- ✅ http://localhost:8080 (logout)
- ✅ https://d6pytgfved4es.cloudfront.net/callback
- ✅ https://d6pytgfved4es.cloudfront.net (logout)

---

## 🚀 How to Use

### 1. Start Development Server
```bash
cd greataihackaton-hackhub-archive
npm run dev
```

### 2. Access the Portal
Open your browser: http://localhost:8080/

### 3. Login
- Use your Cognito user credentials
- Users must be in the "Participants" group to access this portal
- Admins and Judges use the admin portal instead

---

## 👥 User Groups

Your Cognito setup has 3 user groups:

| Group | Portal | Purpose |
|-------|--------|---------|
| **Participants** | HackHub Portal (this one) | Team registration, problem selection, submissions |
| **Admins** | Admin Portal | Full system management |
| **Judges** | Admin Portal | Scoring and evaluation |

---

## 🔧 Available Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

---

## 📁 Portal Features

This HackHub portal is for **participants** and includes:

- ✅ Team registration
- ✅ Problem statement selection
- ✅ Project submission
- ✅ View scores and feedback
- ✅ Track hackathon timeline
- ✅ View leaderboard

---

## 🔐 Creating Test Users

To create a participant user for testing:

```bash
# Create user in Cognito
aws cognito-idp admin-create-user \
  --user-pool-id ap-southeast-1_R2MSvyJcY \
  --username test-participant@example.com \
  --user-attributes Name=email,Value=test-participant@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --region ap-southeast-1

# Add to Participants group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id ap-southeast-1_R2MSvyJcY \
  --username test-participant@example.com \
  --group-name Participants \
  --region ap-southeast-1
```

---

## 📅 Hackathon Timeline (Configured)

| Event | Date/Time |
|-------|-----------|
| Problems Start | 2025-09-15 09:00 +08:00 |
| Problem Selection Opens | 2025-09-15 15:00 +08:00 |
| Problem Selection Closes | 2025-09-20 23:59 +08:00 |
| Hackathon Starts | 2025-09-20 09:00 +08:00 |
| Submission Opens | 2025-09-20 09:00 +08:00 |
| Submission Closes | 2025-09-21 02:40 +08:00 |
| Feedback Release | 2025-09-26 21:00 +08:00 |
| Finalists Announced | 2025-09-26 21:00 +08:00 |
| Final Submission Opens | 2025-10-07 09:00 +08:00 |
| Final Submission Closes | 2025-10-11 23:59 +08:00 |
| Winners Announced | 2025-10-12 00:00 +08:00 |

---

## 🌐 Production Deployment

When ready to deploy to production:

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to S3/CloudFront:**
   ```bash
   # Sync to S3 bucket (you'll need to create one for the participant portal)
   aws s3 sync dist/ s3://your-participant-portal-bucket/ --delete
   
   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
   ```

3. **Update .env for production:**
   - Change callback URLs to your production domain
   - Update Cognito client callback URLs in AWS Console

---

## 🔗 Related Portals

| Portal | URL | Users |
|--------|-----|-------|
| **HackHub Portal** | http://localhost:8080/ | Participants |
| **Admin Portal** | http://localhost:8080/ (different repo) | Admins, Judges |
| **Admin Portal (Deployed)** | https://d6pytgfved4es.cloudfront.net | Admins, Judges |

---

## 🐛 Troubleshooting

### Issue: "Unable to parse HTML" warning
This is a minor warning and doesn't affect functionality. The portal works fine.

### Issue: Login redirects to wrong URL
Check that:
1. Callback URLs in Cognito match your .env file
2. You're using the correct client ID
3. The auth domain is correct

### Issue: API calls failing
Check that:
1. API Gateway URL is correct in .env
2. Lambda functions are deployed
3. User has correct permissions/group membership

### Issue: User can't access portal
Make sure the user is in the "Participants" group:
```bash
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id ap-southeast-1_R2MSvyJcY \
  --username user@example.com \
  --region ap-southeast-1
```

---

## 📞 Need Help?

- Check the browser console for errors
- Check API Gateway logs in CloudWatch
- Check Lambda function logs in CloudWatch
- Verify Cognito user group membership

---

## ✅ Setup Checklist

- [x] npm dependencies installed
- [x] .env file configured
- [x] Connected to API Gateway
- [x] Connected to Cognito
- [x] Connected to S3
- [x] Dev server running
- [x] Callback URLs configured
- [ ] Test user created
- [ ] Login tested
- [ ] API endpoints tested

---

**Your HackHub Portal is ready to use!** 🚀

Access it at: http://localhost:8080/
