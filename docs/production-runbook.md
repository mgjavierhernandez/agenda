# Production Runbook — Agenda Escolar Digital v1.0.0

Operational guide for deploying, monitoring, and maintaining the platform in production.

## Quick Reference

| Service | Port | Health Check |
|---------|------|-------------|
| API | 3000 | `GET /api/v1/health` |
| Web (nginx) | 80 | `GET /` |
| PostgreSQL | 5432 | `pg_isready` |

## Deploy

```bash
# 1. Install dependencies
npm ci

# 2. Build Docker images
docker build -f apps/api/Dockerfile -t agenda-api:1.0.0 .
docker build -f apps/web/Dockerfile -t agenda-web:1.0.0 .

# 3. Configure environment
cp .env.example .env
# Edit .env with production credentials

# 4. Start PostgreSQL (if not using managed DB)
docker compose -f infra/docker/docker-compose.yml up -d

# 5. Run database migrations
npx prisma migrate deploy

# 6. Seed initial data (first deploy only)
npx ts-node --compiler-options '{"module":"CommonJS"}' apps/api/prisma/seed.ts

# 7. Start API
docker run -d \
  --name agenda-api \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  agenda-api:1.0.0

# 8. Start Web
docker run -d \
  --name agenda-web \
  -p 80:80 \
  --restart unless-stopped \
  agenda-web:1.0.0

# 9. Verify
curl http://localhost:3000/api/v1/health
curl http://localhost:80/
```

## Database Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Generate Prisma client (after schema changes)
npx prisma generate
```

**CRITICAL**: Never run `prisma migrate dev` or `prisma db push` in production.

## Backup & Restore

### Create Backup

```bash
pg_dump -U agenda -d agenda_prod -F c -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore Backup

```bash
pg_restore -U agenda -d agenda_prod -c backup_YYYYMMDD_HHMMSS.dump
```

### Automated Backup (cron)

```bash
# Add to crontab: daily backup at 2 AM
0 2 * * * pg_dump -U agenda -d agenda_prod -F c -f /backups/agenda_$(date +\%Y\%m\%d).dump
```

## Monitoring

### Health Endpoints

```bash
# Liveness (is the process running?)
curl http://localhost:3000/api/v1/health
# Expected: {"status":"ok","timestamp":"...","uptime":123.456}

# Readiness (can it serve requests?)
curl http://localhost:3000/api/v1/readiness
# Expected: {"status":"ok","timestamp":"...","database":"connected"}
```

### Docker Health

```bash
docker inspect --format='{{.State.Health.Status}}' agenda-api
docker inspect --format='{{.State.Health.Status}}' agenda-web
```

### Logs

```bash
# API logs
docker logs -f agenda-api

# Web logs
docker logs -f agenda-web

# PostgreSQL logs
docker logs -f agenda-postgres
```

## Rollback

### Application Rollback

```bash
# Stop current version
docker stop agenda-api agenda-web
docker rm agenda-api agenda-web

# Start previous version
docker run -d --name agenda-api --env-file .env -p 3000:3000 agenda-api:<previous-tag>
docker run -d --name agenda-web -p 80:80 agenda-web:<previous-tag>
```

### Database Rollback

```bash
# Restore from backup (IRREVERSIBLE - data after backup will be lost)
pg_restore -U agenda -d agenda_prod -c backup_YYYYMMDD_HHMMSS.dump
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| API won't start | Check `DATABASE_URL`, ensure PostgreSQL is running |
| 503 on readiness | Database connection failed, check PostgreSQL |
| CORS errors | Set `CORS_ORIGIN` to your frontend domain |
| JWT errors | Ensure `JWT_ACCESS_SECRET` is set (min 32 chars) |
| File upload fails | Check `FILE_STORAGE_PATH` exists and is writable |
| Rate limiting | Adjust `RATE_LIMIT_TTL` and `RATE_LIMIT_LIMIT` |

## Security Maintenance

- **Rotate JWT secrets** every 90 days
- **Update dependencies** monthly (`npm audit fix`)
- **Review access logs** weekly
- **Backup database** daily
- **Update Docker images** for security patches
