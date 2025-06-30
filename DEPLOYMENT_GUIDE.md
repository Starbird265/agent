# 🚀 AI TrainEasy MVP - Beta Deployment Guide

**Production-ready deployment for beta testing**

---

## 📋 **Pre-Deployment Checklist**

### **✅ Requirements Verified**
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed  
- [ ] 4GB+ RAM available
- [ ] 2GB+ disk space free
- [ ] Internet connection (for dependencies)

### **✅ Security Configuration**
- [ ] Environment variables configured
- [ ] CORS origins restricted to known domains
- [ ] File upload limits set (100MB)
- [ ] Log rotation configured
- [ ] SSL certificates ready (production)

---

## 🛠️ **Quick Deployment Steps**

### **1. Initial Setup**

```bash
# Clone repository
git clone <your-repo-url>
cd ai-traineasy-mvp

# Run automated setup
python setup.py

# Verify installation
python test_beta.py
```

### **2. Backend Configuration**

```bash
cd packages/backend

# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

**Key settings:**
```bash
# Production settings
SECRET_KEY=your-super-secret-production-key-here
ENVIRONMENT=production

# Security
MAX_FILE_SIZE_MB=100
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Optional: Hugging Face integration
HUGGINGFACE_HUB_TOKEN=your_hf_token_here
```

### **3. Frontend Configuration**

```bash
cd packages/frontend

# Create production environment
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production

# Build for production
npm run build
```

### **4. Start Services**

**Development (Local Testing):**
```bash
# Terminal 1: Backend
cd packages/backend
python main_simple.py

# Terminal 2: Frontend
cd packages/frontend
npm run dev
```

**Production (Server Deployment):**
```bash
# Backend with Gunicorn
cd packages/backend
gunicorn main_simple:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend with Nginx
# Copy dist/ folder to web server
```

---

## 🐳 **Docker Deployment**

### **Create Docker Files**

**Backend Dockerfile:**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY packages/backend/requirements.txt .
RUN pip install -r requirements.txt

COPY packages/backend/ .

EXPOSE 8000

CMD ["python", "main_simple.py"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY packages/frontend/package*.json ./
RUN npm install

COPY packages/frontend/ .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html

EXPOSE 80
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  backend:
    build: 
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - SECRET_KEY=${SECRET_KEY}
    volumes:
      - ./data:/app/projects

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - backend
```

**Deploy with Docker:**
```bash
# Build and start
docker-compose up -d

# Monitor logs
docker-compose logs -f

# Health check
curl http://localhost:8000/health
```

---

## ☁️ **Cloud Deployment Options**

### **Option 1: VPS/DigitalOcean/Linode**

**1. Server Setup:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and Node
sudo apt install python3 python3-pip nodejs npm -y

# Install PM2 for process management
sudo npm install -g pm2
```

**2. Deploy Application:**
```bash
# Clone and setup
git clone <repo-url> ai-traineasy
cd ai-traineasy
python setup.py

# Start with PM2
pm2 start packages/backend/main_simple.py --name backend --interpreter python
pm2 start packages/frontend/dist --name frontend --port 3000

# Setup auto-restart
pm2 startup
pm2 save
```

**3. Configure Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        root /path/to/ai-traineasy/packages/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **Option 2: Heroku Deployment**

**1. Prepare for Heroku:**
```bash
# Create Procfile
echo "web: python packages/backend/main_simple.py" > Procfile

# Create runtime.txt
echo "python-3.9.19" > runtime.txt

# Update requirements.txt
echo "gunicorn" >> packages/backend/requirements.txt
```

**2. Deploy:**
```bash
# Login and create app
heroku login
heroku create ai-traineasy-beta

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set ENVIRONMENT=production

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### **Option 3: AWS/GCP/Azure**

**Use their respective container services:**
- AWS: ECS + ALB
- GCP: Cloud Run + Cloud SQL
- Azure: Container Instances + App Service

---

## 📊 **Monitoring & Maintenance**

### **Health Monitoring**

**1. Setup Health Checks:**
```bash
# Run health check script
python packages/backend/health_check.py --monitor 60

# Or setup cron job
*/5 * * * * /usr/bin/python3 /path/to/health_check.py >> /var/log/ai-traineasy-health.log 2>&1
```

**2. Log Monitoring:**
```bash
# Check application logs
tail -f packages/backend/app.log

# Monitor system resources
htop
df -h
```

**3. Automated Alerts:**
```bash
# Simple email alert script
python scripts/alert_monitor.py --email admin@yourdomain.com
```

### **Backup Strategy**

**1. Data Backup:**
```bash
# Backup projects directory
tar -czf backup-$(date +%Y%m%d).tar.gz packages/backend/projects/

# Upload to cloud storage
aws s3 cp backup-*.tar.gz s3://your-backup-bucket/
```

**2. Database Backup (if using):**
```bash
# PostgreSQL
pg_dump ai_traineasy > backup-$(date +%Y%m%d).sql

# MySQL
mysqldump ai_traineasy > backup-$(date +%Y%m%d).sql
```

### **Update Procedure**

**1. Pre-update checklist:**
```bash
# Backup data
./backup.sh

# Run current tests
python test_beta.py

# Check system resources
python packages/backend/health_check.py
```

**2. Update steps:**
```bash
# Pull latest code
git pull origin main

# Update dependencies
pip install -r packages/backend/requirements.txt
cd packages/frontend && npm install

# Run tests
python test_beta.py

# Restart services
pm2 restart all
```

---

## 🔒 **Security Hardening**

### **Server Security**

**1. Firewall Configuration:**
```bash
# Enable UFW
sudo ufw enable

# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8000  # Backend (if direct access needed)
```

**2. SSL Certificate:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

**3. Rate Limiting:**
```nginx
# Add to Nginx config
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    # ... rest of config
}
```

### **Application Security**

**1. Environment Security:**
```bash
# Secure .env file
chmod 600 packages/backend/.env
chown app:app packages/backend/.env
```

**2. Process Security:**
```bash
# Run as non-root user
useradd -m -s /bin/bash aitrainer
chown -R aitrainer:aitrainer /path/to/ai-traineasy
```

---

## 🧪 **Testing in Production**

### **Smoke Tests**

```bash
# Quick functionality test
curl https://yourdomain.com/api/health
curl https://yourdomain.com/api/system-info

# Full test suite
python test_beta.py --url https://yourdomain.com/api
```

### **Load Testing**

```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test API endpoints
ab -n 1000 -c 10 https://yourdomain.com/api/health
ab -n 100 -c 5 -p test_data.json -T application/json https://yourdomain.com/api/projects/create
```

### **Security Testing**

```bash
# Basic security scan
nmap -sV yourdomain.com

# Check for common vulnerabilities
python scripts/security_scan.py --url https://yourdomain.com
```

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

**1. Backend Won't Start:**
```bash
# Check logs
tail -n 50 packages/backend/app.log

# Check port availability
sudo netstat -tlnp | grep :8000

# Check Python dependencies
pip check
```

**2. High Memory Usage:**
```bash
# Monitor processes
ps aux | grep python

# Check for memory leaks
python -m memory_profiler main_simple.py
```

**3. Database Connection Issues:**
```bash
# Test database connectivity
python -c "from database import init_db; init_db()"

# Check database logs
tail -f /var/log/postgresql/postgresql*.log
```

### **Performance Optimization**

**1. Backend Optimization:**
```python
# Enable compression
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add caching
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend
```

**2. Frontend Optimization:**
```bash
# Optimize build
npm run build -- --mode production

# Enable compression in Nginx
gzip on;
gzip_types text/css application/javascript application/json;
```

---

## 📈 **Scaling Considerations**

### **Horizontal Scaling**

**1. Load Balancer Setup:**
```nginx
upstream backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}
```

**2. Database Scaling:**
- Read replicas for queries
- Connection pooling
- Database clustering

### **Vertical Scaling**

**1. Resource Monitoring:**
```bash
# Monitor resource usage
python packages/backend/health_check.py --monitor 60

# Adjust based on usage patterns
```

**2. Configuration Tuning:**
```bash
# Increase worker processes
gunicorn main_simple:app -w 8 -k uvicorn.workers.UvicornWorker

# Tune memory limits
export MAX_MEMORY_MB=2048
```

---

## 🎯 **Success Metrics**

### **Key Performance Indicators (KPIs)**

- **Uptime**: >99.5%
- **Response Time**: <500ms (95th percentile)
- **Error Rate**: <1%
- **Training Success Rate**: >95%

### **Monitoring Dashboard**

Track these metrics:
- API response times
- Training completion rates
- System resource usage
- User activity patterns
- Error frequency and types

---

**🎉 Congratulations! Your AI TrainEasy MVP is now ready for beta testing.**

For additional support, check the troubleshooting section or contact [support@yourdomain.com].

---

*Last Updated: [Current Date]*