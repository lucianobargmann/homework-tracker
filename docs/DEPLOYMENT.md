# Production Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Environment Configuration

Copy the production environment template:
```bash
cp .env.production .env.local
```

**IMPORTANT**: Update these values in `.env.local`:
- `NEXTAUTH_URL`: Set to your actual domain (e.g., `https://homework.metacto.com`)
- `NEXTAUTH_SECRET`: Generate a secure random string (32+ characters)
- `SMTP_FROM`: Use your verified sender email address

### 2. Generate Secure NextAuth Secret

```bash
# Generate a secure secret
openssl rand -base64 32
# OR
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Database Setup

For production, consider upgrading to PostgreSQL:

```bash
# Install PostgreSQL adapter
npm install @prisma/client pg
npm install -D @types/pg

# Update DATABASE_URL in .env.local
DATABASE_URL="postgresql://username:password@localhost:5432/homework_tracker"
```

Or keep SQLite for simple deployments:
```bash
# Ensure database directory exists
mkdir -p prisma
```

### 4. Build and Deploy

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Build the application
npm run build

# Start production server
npm start
```

## 🌐 Platform-Specific Deployment

### Vercel Deployment

1. **Connect Repository**: Link your GitHub repository to Vercel

2. **Environment Variables**: Add these in Vercel dashboard:
   ```
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-generated-secret
   SUPERADMINS=luciano.bargmann@metacto.com
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   SMTP_FROM=noreply@your-domain.com
   DATABASE_URL=file:./prod.db
   ```

3. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`

### Railway Deployment

1. **Connect Repository**: Link your GitHub repository

2. **Environment Variables**: Same as Vercel above

3. **Database**: Railway provides PostgreSQL - update DATABASE_URL accordingly

### Docker Deployment

```dockerfile
# Dockerfile is already created in the project
docker build -t homework-tracker .
docker run -p 3000:3000 --env-file .env.local homework-tracker
```

## ✅ Production Checklist

### Security
- [ ] `NEXTAUTH_SECRET` is a secure random string (32+ characters)
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] SMTP credentials are secure and working
- [ ] Database is properly secured (not publicly accessible)
- [ ] HTTPS is enabled on your domain

### Performance
- [ ] Application builds successfully (`npm run build`)
- [ ] All tests pass (`npm test`)
- [ ] Database migrations are applied
- [ ] Static assets are optimized

### Functionality
- [ ] Magic link authentication works with production SMTP
- [ ] Admin can access `/admin` with superadmin email
- [ ] Candidates can complete the full workflow
- [ ] PDF download works correctly
- [ ] Timer functionality persists across page refreshes
- [ ] Submission process completes successfully

### Monitoring
- [ ] Error logging is configured
- [ ] Performance monitoring is set up
- [ ] Database backups are scheduled (if using external DB)

## 🔧 Post-Deployment Configuration

### 1. Test Email Delivery

```bash
# Test magic link email
curl -X POST https://your-domain.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 2. Create First Job Opening

1. Log in as superadmin: `luciano.bargmann@metacto.com`
2. Go to `/admin`
3. Create a job opening
4. Add test candidates

### 3. Verify Candidate Flow

1. Add a test candidate email
2. Send magic link
3. Complete the full candidate workflow
4. Verify submission is recorded

## 🚨 Troubleshooting

### Common Issues

**Email not sending:**
- Verify SMTP credentials
- Check Brevo account status
- Ensure sender email is verified in Brevo

**Database errors:**
- Check DATABASE_URL format
- Ensure database is accessible
- Run `npx prisma db push` to apply schema

**Authentication issues:**
- Verify NEXTAUTH_URL matches your domain
- Check NEXTAUTH_SECRET is set
- Ensure cookies are working (HTTPS required for production)

**Build failures:**
- Run `npm ci` to clean install dependencies
- Check for TypeScript errors: `npx tsc --noEmit`
- Verify all environment variables are set

## 📞 Support

For deployment issues, check:
1. Application logs
2. Database connectivity
3. SMTP configuration
4. Environment variables

The application is production-ready with all security measures and optimizations in place!
