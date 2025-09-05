# VectorBeats Deployment Guide

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM and 20GB disk space
- Git installed
- Port 80, 443, 5000, 6333, 8000 available

### Development Deployment (5 minutes)

```bash
# Clone the repository
git clone https://github.com/Shyam-Raghuwanshi/VectorBeats.git
cd VectorBeats

# Copy and configure environment
cp .env.dev.example .env.dev
# Edit .env.dev with your Spotify credentials

# Start development environment
docker-compose up -d

# Wait for services to start (2-3 minutes)
# Access at http://localhost:3000
```

### Production Deployment (15 minutes)

```bash
# Clone and setup
git clone https://github.com/Shyam-Raghuwanshi/VectorBeats.git
cd VectorBeats

# Configure production environment
cp .env.prod.example .env.prod
# Edit .env.prod with your production values

# Run deployment script
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

# Access at http://localhost (or your domain)
```

## Environment Configuration

### Required Environment Variables

```bash
# Spotify API (Required)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Security (Required for production)
JWT_SECRET=your_64_character_random_string
ENCRYPTION_KEY=your_32_character_encryption_key

# URLs (Update for your domain)
FRONTEND_URL=https://yourapp.com
API_URL=https://api.yourapp.com
```

### Optional Configurations

```bash
# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100        # requests per window

# File Upload Limits
MAX_FILE_SIZE=50MB
MAX_IMAGE_SIZE=10MB
MAX_AUDIO_SIZE=5MB

# Performance
ENABLE_COMPRESSION=true
ENABLE_CACHING=true
ML_WORKERS=4
```

## Service Architecture

```
Frontend (React)  →  Backend (Node.js)  →  ML Service (Python)
      ↓                    ↓                       ↓
   Port 80              Port 5000              Port 8000
      ↓                    ↓                       ↓
      └────────────────────┼───────────────────────┘
                           ↓
                    Vector DB (Qdrant)
                       Port 6333
```

## Deployment Scripts

### Available Scripts

```bash
# Deploy production environment
./scripts/deploy-production.sh

# Update existing deployment
./scripts/update-deployment.sh [--type patch|minor|major] [--force]

# Create system backup
./scripts/backup.sh

# Rollback to previous version
./scripts/rollback.sh [--target backup_name] [--restore-data]

# Health check
./scripts/health-check.sh

# Populate demo database
./scripts/populate-demo-db.sh
```

### Monitoring Commands

```bash
# View all services status
docker-compose -f docker-compose.prod.yml ps

# View logs for all services
docker-compose -f docker-compose.prod.yml logs -f

# View logs for specific service
docker-compose -f docker-compose.prod.yml logs -f backend

# Monitor resource usage
docker stats
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

1. **Install Certbot:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Generate certificates:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Update nginx configuration:**
   ```bash
   # Edit config/nginx.conf
   # Uncomment HTTPS server block
   # Update SSL certificate paths
   ```

4. **Restart frontend service:**
   ```bash
   docker-compose -f docker-compose.prod.yml restart frontend
   ```

### Using Custom Certificates

1. **Place certificates in ssl/ directory:**
   ```
   ssl/
   ├── cert.pem
   └── private.key
   ```

2. **Update docker-compose.prod.yml:**
   ```yaml
   frontend:
     volumes:
       - ./ssl:/etc/nginx/ssl:ro
   ```

## Database Management

### Backup and Restore

```bash
# Create backup
./scripts/backup.sh

# List available backups
ls -la /backups/vectorbeats_backup_*.tar.gz

# Restore from backup
./scripts/rollback.sh --target backup_name --restore-data
```

### Database Maintenance

```bash
# Check Qdrant status
curl http://localhost:6333/collections

# Qdrant collection info
curl http://localhost:6333/collections/music_embeddings

# Redis status
docker exec vectorbeats-redis-prod redis-cli info

# Clear Redis cache
docker exec vectorbeats-redis-prod redis-cli flushall
```

## Scaling and Performance

### Horizontal Scaling

```yaml
# docker-compose.prod.yml modifications for scaling
backend:
  deploy:
    replicas: 3
    resources:
      limits:
        memory: 1G
        cpus: '1'

ml-service:
  deploy:
    replicas: 2
    resources:
      limits:
        memory: 4G
        cpus: '2'
```

### Load Balancing

```bash
# Scale backend service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Scale ML service
docker-compose -f docker-compose.prod.yml up -d --scale ml-service=2
```

### Performance Optimization

```bash
# Monitor performance
docker stats

# View resource usage
docker system df

# Clean up unused resources
docker system prune -f
```

## Security Configuration

### Firewall Setup

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SSH (if needed)
sudo ufw allow 22

# Block all other ports
sudo ufw --force enable
```

### Security Headers

Update `config/nginx.conf` with security headers:

```nginx
# Security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Strict-Transport-Security "max-age=63072000" always;
```

## Monitoring and Alerting

### Prometheus Metrics

Access Prometheus at `http://localhost:9090`

Key metrics to monitor:
- Request rate and latency
- Error rate
- Resource utilization
- ML model inference time

### Grafana Dashboards

Access Grafana at `http://localhost:3001` (admin/admin)

Pre-configured dashboards:
- System Overview
- Application Performance
- ML Service Metrics
- Database Performance

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Export logs for analysis
docker-compose -f docker-compose.prod.yml logs --no-color > app_logs.txt

# Filter logs by service
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR
```

## Troubleshooting

### Common Issues

**Service won't start:**
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs [service_name]

# Check resource usage
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart [service_name]
```

**High memory usage:**
```bash
# Check memory usage
free -h
docker stats

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

**Database connection issues:**
```bash
# Check Qdrant status
curl http://localhost:6333/health

# Check Redis connection
docker exec vectorbeats-redis-prod redis-cli ping

# Restart database services
docker-compose -f docker-compose.prod.yml restart qdrant redis
```

### Performance Issues

**Slow API responses:**
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Monitor ML service
docker-compose -f docker-compose.prod.yml logs ml-service

# Check resource constraints
docker stats
```

**High CPU usage:**
```bash
# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Check for resource limits
docker-compose -f docker-compose.prod.yml config
```

## Maintenance

### Regular Tasks

**Daily:**
- Check service health: `./scripts/health-check.sh`
- Monitor error logs
- Verify backup completion

**Weekly:**
- Update system packages
- Review performance metrics
- Clean up old Docker images: `docker system prune -f`

**Monthly:**
- Security updates
- Review and optimize configurations
- Capacity planning review

### Update Procedures

**Patch Updates:**
```bash
./scripts/update-deployment.sh --type patch
```

**Minor Updates:**
```bash
# Backup first
./scripts/backup.sh

# Update with rollback protection
./scripts/update-deployment.sh --type minor
```

**Major Updates:**
```bash
# Full backup
./scripts/backup.sh

# Test in staging environment first
# Then deploy to production
./scripts/update-deployment.sh --type major
```

## Support and Resources

### Documentation
- [API Documentation](./API.md)
- [User Guide](./USER_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Performance Benchmarks](./PERFORMANCE_BENCHMARKS.md)

### Getting Help
- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Email:** support@vectorbeats.com
- **Discord:** https://discord.gg/vectorbeats

### Contributing
- Fork the repository
- Create feature branch
- Submit pull request
- Follow code review process

---

**Need immediate assistance?** Run `./scripts/health-check.sh` for system status or contact support with your deployment logs.
