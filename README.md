# Homework Assignment Tracker

A full-stack web application for managing candidate homework assignments with magic link authentication, timer functionality, and admin monitoring.

## Features

### Authentication
- Magic link authentication via email
- Passwordless login system
- Admin-only access control via environment variables
- Session management with NextAuth.js

### Admin Features
- Create job openings
- Add candidates to specific job openings
- Monitor candidate progress in real-time
- View submission details (GitHub links, prompts used)
- Archive/unarchive candidates
- Track time taken for each assignment

### Candidate Features
- Protected welcome page with timer warning
- Persistent timer that survives page refreshes
- PDF assignment download
- Submission form for GitHub repository and prompts
- Timestamp locking after submission

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js with email provider
- **Email**: Nodemailer (supports Mailpit for local dev, Brevo for production)
- **Testing**: Jest with React Testing Library

## Setup Instructions

1. **Clone and install dependencies**:
   ```bash
   cd homework-tracker
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env` and configure:
   ```
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"
   SUPERADMINS="admin@example.com"
   SMTP_HOST="localhost"
   SMTP_PORT="1025"
   SMTP_FROM="noreply@homework-tracker.local"
   ```

3. **Set up database**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **For local email testing, start Mailpit**:
   ```bash
   # Install Mailpit first
   mailpit
   ```

## Usage

### Admin Workflow
1. Sign in with superadmin email
2. Create job openings
3. Add candidates with their email addresses
4. Monitor candidate progress on the dashboard
5. Review submissions and archive completed candidates

### Candidate Workflow
1. Receive magic link email
2. Sign in and see welcome page with timer warning
3. Start assignment (timer begins)
4. Download PDF assignment
5. Complete work and submit GitHub repository + prompts
6. View confirmation with locked timestamp

## API Endpoints

### Admin Routes
- `GET /api/admin/job-openings` - List job openings
- `POST /api/admin/job-openings` - Create job opening
- `GET /api/admin/candidates` - List candidates
- `POST /api/admin/candidates` - Create candidate
- `PATCH /api/admin/candidates/[id]` - Update candidate (archive)

### Candidate Routes
- `GET /api/candidate/profile` - Get candidate profile
- `POST /api/candidate/start` - Start assignment timer
- `POST /api/candidate/submit` - Submit assignment

## Testing

Run tests:
```bash
npm test
npm run test:watch
npm run test:coverage
```

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: Unique email address
- `is_admin`: Boolean flag for admin access
- `job_opening_id`: Foreign key to job opening
- `started_at`: Timestamp when assignment started
- `submitted_at`: Timestamp when assignment submitted
- `github_link`: Repository URL
- `prompts_used`: Text field for audit trail
- `archived`: Boolean flag for archiving

### Job Openings Table
- `id`: UUID primary key
- `name`: Job opening name
- `created_at`: Creation timestamp

## Security Features

- Admin access restricted by environment variable
- Protected routes with middleware
- Session-based authentication
- CSRF protection via NextAuth.js
- Input validation and sanitization

## QA Checkpoints ✅

- [x] Magic link auth with email (Mailpit/local)
- [x] Admin login only via .env
- [x] Candidates only access their own views
- [x] Candidate /welcome gated and tracked
- [x] Timer starts only once, cannot be reset
- [x] GitHub submission locked after submit
- [x] Admin dashboard shows candidate statuses
- [x] All data stored securely in SQLite

## Production Deployment

1. Update environment variables for production
2. Configure SMTP settings for Brevo or other email service
3. Set secure NEXTAUTH_SECRET
4. Deploy to your preferred platform (Vercel, Railway, etc.)
5. Ensure database persistence in production environment
