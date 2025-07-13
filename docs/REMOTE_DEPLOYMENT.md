# 🚀 Remote Deployment Guide

## Overview

This guide covers building the Docker image locally and deploying it to your remote server via SSH.

## 📋 Prerequisites

### Local Machine
- Docker installed and running
- SSH access to server with private key
- `pv` command (optional, for progress bar): `brew install pv` or `sudo apt-get install pv`

### Remote Server
- Docker and Docker Compose installed
- Traefik reverse proxy running
- Project directory: `/opt/hcktplanet/homework-tracker`

## 🔧 Quick Deployment

### 1. Local Build and Transfer

```bash
# Build and transfer to server
npm run deploy:remote

# Or run the script directly
./scripts/build-and-deploy.sh
```

This script will:
- ✅ Load environment variables from `.env.production`
- ✅ Build Docker image with timestamp tag
- ✅ Transfer image to server via SSH
- ✅ Show next steps

### 2. Server Deployment

SSH to your server and run:

```bash
# SSH to server
ssh -i ~/.ssh/hunt-luke-2025.pem root@164.163.10.235

# Navigate to project directory
cd /opt/hcktplanet/homework-tracker

# Run server startup script
./scripts/start-server.sh
```

This will:
- ✅ Create Traefik network if needed
- ✅ Update docker-compose.yml with new image
- ✅ Deploy with docker-compose
- ✅ Test health endpoint

## 📁 File Structure

```
homework-tracker/
├── scripts/
│   ├── build-and-deploy.sh    # Local: Build and transfer
│   ├── start-server.sh        # Server: Start application
│   └── deploy-traefik.sh      # Local: Direct deployment
├── docker-compose.yml         # Traefik configuration
├── .env.production           # Environment template
└── Dockerfile               # Multi-stage build
```

## 🔐 Environment Setup

### Local (.env.production)
```env
NEXTAUTH_URL=https://homework.hcktplanet.com
NEXTAUTH_SECRET=your-secure-random-string
SUPERADMINS=luciano.bargmann@metacto.com
DATABASE_URL=file:./prod.db
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@metacto.com
```

### Server (.env)
Same as above, but with actual credentials filled in.

## 🐳 Docker Configuration

### Image Naming
- **Repository**: `hcktplanet/homework-tracker`
- **Tags**: Timestamped (e.g., `20250713123456`) + `latest`
- **Platform**: `linux/amd64` for server compatibility

### Build Process
1. Multi-stage build (deps → builder → runner)
2. Next.js standalone output for optimization
3. Prisma client generation
4. Production optimizations

## 🌐 Traefik Integration

### Labels in docker-compose.yml
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.homework.rule=Host(`homework.hcktplanet.com`)"
  - "traefik.http.routers.homework.entrypoints=websecure"
  - "traefik.http.routers.homework.tls.certresolver=letsencrypt"
  - "traefik.http.services.homework.loadbalancer.server.port=3000"
```

### Network
- External network: `traefik`
- Automatic SSL with Let's Encrypt
- Security headers via middleware

## 🔍 Monitoring & Troubleshooting

### Health Checks
```bash
# Test application health
curl https://homework.hcktplanet.com/api/health

# Check container status
docker-compose ps

# View logs
docker-compose logs -f homework-tracker
```

### Common Issues

**1. Traefik network not found:**
```bash
docker network create traefik
```

**2. Image transfer fails:**
- Check SSH key permissions: `chmod 600 ~/.ssh/hunt-luke-2025.pem`
- Verify server connectivity: `ssh -i ~/.ssh/hunt-luke-2025.pem root@164.163.10.235`

**3. Container won't start:**
```bash
# Check logs
docker-compose logs homework-tracker

# Check environment variables
docker-compose exec homework-tracker env | grep NEXTAUTH
```

**4. SSL certificate issues:**
```bash
# Check Traefik logs
docker logs traefik

# Verify domain DNS
nslookup homework.hcktplanet.com
```

## 🔄 Update Process

### Regular Updates
1. Make code changes locally
2. Run `npm run deploy:remote`
3. SSH to server and run `./scripts/server-deploy.sh`

### Rollback
```bash
# On server, use previous image
docker images | grep homework-tracker
docker-compose down
# Edit docker-compose.yml with previous tag
docker-compose up -d
```

## 📊 Performance Tips

### Local Build Optimization
- Use `.dockerignore` to exclude unnecessary files
- Multi-stage builds reduce final image size
- Build with `--platform linux/amd64` for server compatibility

### Transfer Optimization
- Use `pv` for progress monitoring
- Compress with `bzip2` for faster transfer
- Transfer both timestamped and latest tags

### Server Optimization
- Regular cleanup: `docker system prune`
- Monitor disk usage: `df -h`
- Use specific image tags in production

## 🚨 Security Considerations

- ✅ SSH key authentication only
- ✅ Environment variables not in images
- ✅ Secrets managed via .env files
- ✅ HTTPS enforced via Traefik
- ✅ Security headers configured

## 📞 Support Commands

```bash
# Local development
npm run dev                    # Start dev server
npm run build                  # Test build locally
npm run deploy:remote          # Build and deploy to server

# Server management
docker-compose ps              # Check status
docker-compose logs -f         # View logs
docker-compose restart         # Restart services
docker system df               # Check disk usage
docker system prune            # Clean up
```

---

## 🎯 Quick Reference

**Deploy from local machine:**
```bash
npm run deploy:remote
```

**Deploy on server:**
```bash
ssh -i ~/.ssh/hunt-luke-2025.pem root@164.163.10.235
cd /opt/hcktplanet/homework-tracker
./scripts/start-server.sh
```

**Check deployment:**
```bash
curl https://homework.hcktplanet.com/api/health
```

Your Homework Tracker is now ready for seamless remote deployment! 🎉
