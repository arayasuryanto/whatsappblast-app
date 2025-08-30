# 🏠 Synology NAS DS224+ Deployment Guide

## 📋 Prerequisites

### **Synology DSM Requirements:**
- ✅ DS224+ with DSM 7.0 or higher
- ✅ At least 2GB RAM available
- ✅ Container Manager package installed
- ✅ SSH access enabled (optional)

## 🚀 Method 1: Docker Container (RECOMMENDED)

### **Step 1: Install Container Manager**
1. Open **Package Center** in DSM
2. Search for **"Container Manager"** 
3. Install the package

### **Step 2: Download Project Files**
1. Open **File Station**
2. Create folder: `/docker/whatsapp-blast`
3. Upload all project files to this folder

### **Step 3: Deploy with Docker Compose**

#### **Option A: Using Container Manager GUI**
1. Open **Container Manager**
2. Go to **Project** tab
3. Click **Create**
4. Set **Project Name**: `whatsapp-blast`
5. Set **Path**: `/docker/whatsapp-blast`
6. The `docker-compose.yml` will be auto-detected
7. Click **Next** → **Done**

#### **Option B: Using SSH/Terminal**
```bash
# SSH into your NAS
ssh admin@your-nas-ip

# Navigate to project directory
cd /volume1/docker/whatsapp-blast

# Start the container
sudo docker-compose up -d

# Check status
sudo docker-compose ps
```

### **Step 4: Configure Port Access**

#### **Internal Network Access:**
- App will be available at: `http://nas-ip:3000`
- Example: `http://192.168.1.100:3000`

#### **External Access (Internet):**
1. **Router Port Forwarding:**
   - Forward external port (e.g., 8080) to NAS port 3000
   - Example: `external:8080 → 192.168.1.100:3000`

2. **Synology Firewall:**
   - **Control Panel** → **Security** → **Firewall**
   - Add rule: Allow port 3000

3. **DDNS Setup (Optional):**
   - **Control Panel** → **External Access** → **DDNS**
   - Set up dynamic DNS for easy access
   - Example: `mynas.synology.me:8080`

## 🚀 Method 2: Node.js Direct Install

### **Step 1: Install Node.js**
1. Open **Package Center**
2. Search for **"Node.js v20"**  
3. Install the package

### **Step 2: Upload Files**
1. Upload project to `/home/whatsapp-blast/`
2. Set proper permissions

### **Step 3: Install Dependencies**
```bash
# SSH into NAS
ssh admin@your-nas-ip

# Navigate to app directory
cd /volume1/homes/admin/whatsapp-blast

# Install dependencies
npm install

# Start the application
npm start
```

### **Step 4: Create Startup Script**
Create file: `/usr/local/etc/rc.d/whatsapp-blast.sh`
```bash
#!/bin/sh

case $1 in
    start)
        cd /volume1/homes/admin/whatsapp-blast
        npm start > /dev/null 2>&1 &
        ;;
    stop)
        pkill -f "node server.js"
        ;;
esac
```

## 🔧 Configuration

### **Environment Variables:**
Edit `docker-compose.yml` to customize:
```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - FIREBASE_CONFIG_PATH=/app/firebase-config.json
```

### **Data Persistence:**
- **WhatsApp Sessions**: `/volume1/docker/whatsapp-blast/auth_info`
- **Uploaded Files**: `/volume1/docker/whatsapp-blast/uploads`
- **App Data**: `/volume1/docker/whatsapp-blast/data`

## 🌐 Access Your App

### **Local Network:**
- `http://192.168.1.100:3000` (replace with your NAS IP)

### **Internet Access:**
- Set up port forwarding: External port → NAS:3000
- Example: `http://your-public-ip:8080`
- Or use DDNS: `http://mynas.synology.me:8080`

## 🔒 Security Recommendations

### **Firewall Rules:**
```
Allow: Port 3000 (or your custom port)
Source: Your office IP range only
```

### **SSL Certificate:**
1. **Control Panel** → **Security** → **Certificate**
2. Add Let's Encrypt certificate for your domain
3. Configure reverse proxy for HTTPS

### **User Access:**
- Create dedicated DSM user for WhatsApp Blast
- Limit permissions to necessary folders only

## 🔧 Troubleshooting

### **Container Won't Start:**
```bash
# Check logs
sudo docker-compose logs whatsapp-blast

# Common issues:
# 1. Port already in use
# 2. Insufficient RAM  
# 3. Permission issues
```

### **WhatsApp Connection Issues:**
```bash
# Check auth_info permissions
ls -la auth_info/

# Reset WhatsApp session
rm -rf auth_info/*
sudo docker-compose restart
```

### **Memory Issues:**
- DS224+ has 2GB RAM base
- WhatsApp app uses ~150MB
- Consider RAM upgrade to 6GB if running multiple containers

## 🎯 Production Setup

### **Automatic Startup:**
- Container Manager auto-starts containers on boot
- No additional configuration needed

### **Backup Strategy:**
1. **App Data**: Backup `/docker/whatsapp-blast/` folder
2. **WhatsApp Sessions**: Critical for persistent connection
3. **Campaign History**: Stored in localStorage and Firebase

### **Monitoring:**
- Container Manager shows resource usage
- Set up log rotation for long-term stability
- Monitor RAM usage in DSM Resource Monitor

## ✅ Testing Checklist

- [ ] Container starts successfully
- [ ] Health check passes: `/health`
- [ ] Main interface loads: `/`
- [ ] WhatsApp QR generates: `/status`
- [ ] Firebase real-time works
- [ ] File uploads work
- [ ] Campaign creation works
- [ ] External access works (if configured)

## 🎉 Advantages of NAS Deployment

✅ **Persistent WhatsApp connection** (24/7 running)
✅ **No monthly cloud costs** (one-time setup)
✅ **Full control** over data and privacy
✅ **Better performance** (dedicated hardware)
✅ **Local network speed** (faster for office use)
✅ **Automatic backups** (NAS built-in features)
✅ **Expandable storage** (for campaign history)

## 🆘 Support

If you encounter issues:
1. Check Container Manager logs
2. Verify port forwarding settings  
3. Test local access first, then external
4. Check Synology community forums
5. Review DSM system logs

Your DS224+ is perfect for this application! 🚀