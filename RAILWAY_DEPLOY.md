# 🚂 Railway Deployment Fix Guide

## Quick Deployment Fix

### 1. Check Railway Logs
```bash
# In Railway dashboard, go to:
# Project → Deployments → View Logs
```

### 2. Common Issues & Solutions

#### **Issue: Application failed to respond**

**Solution A: Port Configuration**
- Railway automatically sets `PORT` environment variable
- Our server now uses `PORT || 3000`
- Server binds to `0.0.0.0` instead of `localhost`

**Solution B: Health Check**
```bash
# Test health endpoint
curl https://your-railway-app.railway.app/health
```

**Solution C: Dependencies**
```bash
# Ensure all dependencies are installed
npm install
```

### 3. Railway Environment Setup

#### **Required Files:**
- ✅ `package.json` - Updated with all dependencies
- ✅ `Dockerfile` - Added for better deployment
- ✅ `railway.json` - Railway configuration
- ✅ Server updated with CORS and error handling

#### **Environment Variables:**
Set in Railway dashboard:
```
NODE_ENV=production
PORT=3000 (Railway sets this automatically)
```

### 4. Deployment Steps

#### **Option 1: GitHub Auto-Deploy (Recommended)**
1. Push all changes to GitHub
2. Railway will auto-deploy from main branch
3. Check deployment logs

#### **Option 2: Railway CLI Deploy**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and link project
railway login
railway link

# Deploy
railway up
```

### 5. Verify Deployment

#### **Test Endpoints:**
```bash
# Health check
curl https://your-app.railway.app/health

# Main app
curl https://your-app.railway.app/

# WhatsApp status
curl https://your-app.railway.app/status
```

### 6. Firebase Configuration

#### **Update Firebase Config:**
In `database-service.js`, your config looks correct:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBn-EvBHSKUkFBdPOXUZJDmvDPgnD87lYc",
    authDomain: "whatsapp-blast-demo.firebaseapp.com",
    databaseURL: "https://whatsapp-blast-team-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "whatsapp-blast-team",
    storageBucket: "whatsapp-blast-team.firebasestorage.app",
    messagingSenderId: "892116353481",
    appId: "1:892116353481:web:024363c3d5b79d854d6818"
};
```

#### **Firebase Security Rules:**
```json
{
  "rules": {
    "teams": {
      "$teamId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 7. Debugging Steps

#### **Check Railway Logs:**
```bash
# Look for these in Railway dashboard logs:
✅ "Server running on port XXXX"
❌ "Error starting server"
❌ "Cannot find module"
❌ "Port already in use"
```

#### **Common Error Solutions:**

**Error: "Cannot find module 'cors'"**
```bash
# Add cors to package.json dependencies
npm install cors
```

**Error: "EADDRINUSE: address already in use"**
```bash
# Railway handles port automatically, check server.js uses:
const PORT = process.env.PORT || 3000;
```

**Error: "Firebase connection failed"**
- Check Firebase config is correct
- Verify Firebase project is active
- Check database rules allow access

### 8. Testing After Deploy

#### **Manual Test Checklist:**
- [ ] Health check endpoint responds
- [ ] Main page loads
- [ ] Firebase real-time features work
- [ ] WhatsApp QR generation works
- [ ] Campaign creation works

#### **Team Test:**
- [ ] Multiple users can join same team
- [ ] Real-time activity feed updates
- [ ] Campaign progress syncs across users

### 9. Performance Optimization

#### **Railway Settings:**
```json
{
  "deploy": {
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

#### **Memory Settings:**
- Railway provides 512MB RAM by default
- WhatsApp connection uses ~100MB
- Should be sufficient for small teams

### 10. Troubleshooting Commands

```bash
# Test locally first
npm start
curl http://localhost:3000/health

# Check package.json scripts
npm run start

# Verify all dependencies
npm list

# Check for security vulnerabilities
npm audit
```

## 🆘 Still Having Issues?

1. **Check Railway Status**: https://status.railway.app/
2. **View Deployment Logs**: Railway Dashboard → Deployments → Logs
3. **Test Health Endpoint**: `https://your-app.railway.app/health`
4. **Check Firebase Console**: Verify database rules and usage

## 🎯 Expected Results After Fix:

- ✅ App loads on Railway URL
- ✅ Health endpoint returns 200 OK
- ✅ Real-time features work across devices
- ✅ WhatsApp QR generation works
- ✅ Team collaboration is functional

The deployment should work now with the updated server configuration and error handling!