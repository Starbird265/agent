# 🚀 AI TrainEasy MVP - Render Deployment Guide

## **🔐 Invitation-Only Beta Platform on Render.com**

This guide will help you deploy your **invitation-only** AI TrainEasy MVP to **Render.com** with professional security and scalability.

---

## 📋 **Prerequisites**

- **GitHub account** with your AI TrainEasy repository
- **Render.com account** (free tier available)
- **Domain name** (optional, for custom domain)

---

## 🏗️ **Deployment Architecture**

```
User Browser
     ↓
Frontend (Static Site) → Backend API (Web Service)
     ↓                        ↓
Render CDN              Invitation System
     ↓                        ↓
Static Files            Session Management
```

### **Services:**
1. **Backend API** - Python/FastAPI web service
2. **Frontend** - React SPA static site
3. **Invitation System** - Built-in session management

---

## 🚀 **Step 1: Deploy Backend API**

### **1.1 Create Web Service**
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:

```yaml
Name: ai-traineasy-backend
Runtime: Python 3
Build Command: cd packages/backend && pip install -r requirements.txt
Start Command: cd packages/backend && python main_simple.py
```

### **1.2 Environment Variables**
Add these environment variables in Render:

```bash
# Required
HOST=0.0.0.0
PORT=10000
ENVIRONMENT=production

# CORS (update with your frontend URL)
CORS_ORIGINS=https://your-frontend-url.onrender.com

# Optional
PYTHON_VERSION=3.9
HUGGINGFACE_HUB_TOKEN=your_hf_token_here
```

### **1.3 Service Settings**
- **Plan**: Starter ($7/month) or Free tier
- **Auto-Deploy**: Yes
- **Health Check Path**: `/health`

---

## 🎨 **Step 2: Deploy Frontend**

### **2.1 Create Static Site**
1. In Render Dashboard: **"New +"** → **"Static Site"**
2. Connect same GitHub repository
3. Configure the site:

```yaml
Name: ai-traineasy-frontend
Build Command: cd packages/frontend && npm install && npm run build
Publish Directory: packages/frontend/dist
```

### **2.2 Environment Variables**
```bash
# Point to your backend URL
VITE_API_URL=https://your-backend-url.onrender.com

# Node version
NODE_VERSION=18
```

### **2.3 Redirects (for SPA)**
Add this redirect rule in Render:
```
/*  /index.html  200
```

---

## 🔐 **Step 3: Invitation System Setup**

### **3.1 Default Invitation Codes**
Your app comes with these pre-configured codes:
```bash
BETA-2024-EARLY     # 100 uses, 90 days
AUTOML-PREVIEW      # 100 uses, 90 days  
AI-TRAIN-DEMO       # 100 uses, 90 days
ML-BETA-ACCESS      # 100 uses, 90 days
TRAINEASY-VIP       # 100 uses, 90 days
RENDER-DEPLOY       # 100 uses, 90 days
BETA-TESTER-001     # 100 uses, 90 days
```

### **3.2 Custom Invitation Codes**
To generate custom codes, modify `invitation_system.py`:

```python
# Add custom codes in create_default_codes()
custom_codes = [
    "YOUR-CUSTOM-CODE-1",
    "SPECIAL-ACCESS-2024", 
    "VIP-BETA-USER"
]
```

### **3.3 Session Management**
- **Session Duration**: 24 hours
- **Auto-extension**: Available via API
- **Storage**: Local JSON file (persistent in Render)

---

## 🌐 **Step 4: Custom Domain (Optional)**

### **4.1 Frontend Domain**
1. In Render Dashboard → Your static site
2. Go to **"Settings"** → **"Custom Domains"**
3. Add your domain: `app.yourdomain.com`
4. Update DNS records:
   ```
   Type: CNAME
   Name: app
   Value: your-site.onrender.com
   ```

### **4.2 Backend Domain**
1. In Render Dashboard → Your web service
2. Add custom domain: `api.yourdomain.com`
3. Update CORS environment variable:
   ```bash
   CORS_ORIGINS=https://app.yourdomain.com
   ```

---

## 📊 **Step 5: Monitoring & Logs**

### **5.1 Health Monitoring**
Both services have health checks:
- **Backend**: `https://your-backend.onrender.com/health`
- **Frontend**: Automatic static site monitoring

### **5.2 View Logs**
```bash
# Backend logs
curl https://your-backend.onrender.com/logs

# Render dashboard logs
Dashboard → Service → Logs tab
```

### **5.3 System Stats**
Access at: `https://your-frontend.onrender.com/`
- Navigate to "System" tab
- View CPU, memory, and performance metrics

---

## 🔧 **Step 6: Configuration**

### **6.1 Production Settings**
Update `packages/frontend/src/api.js`:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'https://your-backend.onrender.com';
```

### **6.2 Security Headers**
Render automatically adds:
- HTTPS redirection
- HSTS headers
- X-Frame-Options
- Content Security Policy

---

## 📱 **Step 7: Usage & Access**

### **7.1 Distribute Access**
Share your invitation codes with beta users:
```
🎉 Welcome to AI TrainEasy Beta!

Access URL: https://your-app.onrender.com
Invitation Code: BETA-2024-EARLY

Features:
✨ Advanced AutoML platform
🚀 Real-time model training  
📊 System monitoring
🤖 Hugging Face integration
```

### **7.2 User Workflow**
1. User visits your app URL
2. Enters invitation code
3. Gets 24-hour session access
4. Can extend session as needed
5. Access expires automatically

---

## 💰 **Step 8: Cost Optimization**

### **8.1 Render Pricing**
```
Backend (Starter):  $7/month
Frontend (Free):    $0/month
Custom Domain:      Free
SSL Certificate:    Free
Total:             ~$7/month
```

### **8.2 Scaling Options**
- **Standard Plan**: $25/month (more resources)
- **Pro Plan**: $85/month (dedicated resources)
- **Auto-scaling**: Available on higher plans

---

## 🔄 **Step 9: CI/CD & Updates**

### **9.1 Auto-Deploy**
- Push to `main` branch → Automatic deployment
- Render builds and deploys both services
- Zero-downtime deployments

### **9.2 Rollback**
```bash
# In Render Dashboard
Services → Deployments → Select previous version → Redeploy
```

---

## 🛠️ **Troubleshooting**

### **Common Issues**

**1. Backend Won't Start**
```bash
# Check build logs
cd packages/backend && pip install -r requirements.txt
python main_simple.py

# Common fixes
- Verify Python 3.9+ 
- Check PORT environment variable
- Ensure all dependencies in requirements.txt
```

**2. Frontend Build Fails**
```bash
# Check Node version
cd packages/frontend && npm install && npm run build

# Common fixes  
- Use Node.js 18+
- Clear npm cache: npm cache clean --force
- Check VITE_API_URL environment variable
```

**3. CORS Errors**
```bash
# Update backend CORS_ORIGINS
CORS_ORIGINS=https://your-frontend.onrender.com,https://app.yourdomain.com
```

**4. Invitation Codes Not Working**
```bash
# Check backend logs for validation errors
# Verify codes in invitation_codes.json
# Check session token in browser localStorage
```

---

## 📈 **Performance Optimization**

### **Backend Optimization**
```python
# Add to main_simple.py
import asyncio
import uvloop  # pip install uvloop

if __name__ == "__main__":
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
    uvicorn.run(app, host=host, port=port, loop="uvloop")
```

### **Frontend Optimization**
```javascript
// Already optimized with:
- Vite bundling
- Tree shaking  
- Code splitting
- Gzip compression (Render automatic)
```

---

## 🎯 **Production Checklist**

### **Before Going Live**
- [ ] Backend health check passes
- [ ] Frontend builds successfully  
- [ ] CORS configured correctly
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Invitation codes tested
- [ ] Session management working
- [ ] Monitoring enabled
- [ ] Error handling tested

### **Security Checklist**
- [ ] HTTPS enforced
- [ ] Invitation system active
- [ ] Session tokens secure
- [ ] File upload validation
- [ ] CORS restricted
- [ ] Error messages sanitized
- [ ] No sensitive data in logs

---

## 🚀 **Final Deployment URLs**

After deployment, your app will be available at:

```bash
🌐 Production URLs:
Frontend: https://your-app-name.onrender.com
Backend:  https://your-api-name.onrender.com

📊 Health Checks:
Backend:  https://your-api-name.onrender.com/health
System:   https://your-api-name.onrender.com/system-info

🔐 Invitation Codes:
BETA-2024-EARLY
AUTOML-PREVIEW
AI-TRAIN-DEMO
(and 4 more default codes)
```

---

## 🎉 **Success!**

Your **AI TrainEasy MVP** is now live on Render with:

✅ **Professional deployment** on reliable infrastructure  
✅ **Invitation-only access** for beta security  
✅ **Automatic HTTPS** and security headers  
✅ **Zero-downtime deployments** with CI/CD  
✅ **Custom domain support** for branding  
✅ **Built-in monitoring** and health checks  
✅ **Cost-effective** hosting (~$7/month)  

**Your beta users can now access your world-class AutoML platform!**

---

## 📞 **Support**

For deployment issues:
- **Render Docs**: [render.com/docs](https://render.com/docs)
- **GitHub Issues**: Create issue in your repository
- **Community**: [Render Community](https://community.render.com)

**🌟 Don't forget to star your repository and share your amazing AutoML platform!**