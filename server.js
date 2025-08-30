const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Enable CORS for all origins (for Railway deployment)
app.use(cors({
    origin: true,
    credentials: true
}));

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Explicit routes for JavaScript files (for Railway compatibility)
app.get('/script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'script.js'));
});

app.get('/database-service.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'database-service.js'));
});

app.get('/realtime-ui.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'realtime-ui.js'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        whatsapp: connectionState.connected ? 'connected' : 'disconnected'
    });
});

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

let sock;
let connectionState = {
    connected: false,
    qrCode: null,
    phone: null
};
let connectionAttempts = 0;
let lastError428 = 0;

// Campaign storage
const CAMPAIGNS_FILE = path.join(__dirname, 'campaigns.json');
let campaigns = {
    ongoing: [],
    completed: [],
    scheduled: []
};

// Load campaigns from file
function loadCampaigns() {
    try {
        if (fs.existsSync(CAMPAIGNS_FILE)) {
            const data = fs.readFileSync(CAMPAIGNS_FILE, 'utf8');
            campaigns = JSON.parse(data);
            console.log('📁 Loaded campaigns from file:', {
                ongoing: campaigns.ongoing.length,
                completed: campaigns.completed.length,
                scheduled: campaigns.scheduled.length
            });
        }
    } catch (error) {
        console.error('❌ Error loading campaigns:', error);
        campaigns = { ongoing: [], completed: [], scheduled: [] };
    }
}

// Save campaigns to file
function saveCampaigns() {
    try {
        fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify(campaigns, null, 2));
        console.log('💾 Campaigns saved to file');
    } catch (error) {
        console.error('❌ Error saving campaigns:', error);
    }
}

// Initialize campaigns on startup
loadCampaigns();

async function startSock() {
    try {
        // Create auth directory if it doesn't exist
        const authPath = path.join(__dirname, 'auth_info');
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
        }
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ["Chrome", "Linux", "3.0"],
            logger: require('pino')({ level: 'silent' }),
            // Conservative connection settings to avoid rate limits
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            qrTimeout: 180000, // 3 minutes is safer
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            downloadHistory: false,
            retryRequestDelayMs: 3000,
            maxMsgRetryCount: 1,
            getMessage: async (key) => undefined
        });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        console.log('Connection update:', { connection, qr: !!qr, lastDisconnect: lastDisconnect?.error?.output?.statusCode });
        
        if (qr) {
            console.log("✅ QR Code generated successfully");
            qrcode.generate(qr, { small: true });
            connectionState.qrCode = qr;
            connectionState.connected = false;
        }
        
        if (connection === 'connecting') {
            console.log('🔄 WhatsApp connecting...');
            connectionState.connected = false;
            connectionState.qrCode = null; // Clear QR when connecting
        }
        
        if (connection === 'open') {
            console.log('✅ WhatsApp Connected successfully!');
            connectionState.connected = true;
            connectionState.qrCode = null;
            connectionState.phone = sock.user?.id?.split(':')[0];
            // Reset error counters on successful connection
            connectionAttempts = 0;
            lastError428 = 0;
        }
        
        if (connection === 'close') {
            console.log('❌ WhatsApp Disconnected');
            connectionState.connected = false;
            connectionState.qrCode = null;
            connectionState.phone = null;
            
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            console.log('Should reconnect:', shouldReconnect, 'Reason:', statusCode);
            
            // Handle auth failure (401) - clear session and restart
            if (statusCode === 401) {
                console.log('⚠️ Authentication failed, clearing session...');
                const authPath = path.join(__dirname, 'auth_info');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Auth session cleared');
                }
            }
            
            // Handle specific error codes differently
            if (statusCode === 405) {
                console.log('⚠️ Connection failure (405) - clearing auth and restarting...');
                const authPath = path.join(__dirname, 'auth_info');
                if (fs.existsSync(authPath)) {
                    fs.rmSync(authPath, { recursive: true, force: true });
                    console.log('🗑️ Auth session cleared due to 405 error');
                }
                setTimeout(() => {
                    startSock();
                }, 10000); // Wait longer before retrying
            } else if (statusCode === 428) {
                console.log('⚠️ Connection terminated by WhatsApp server (428) - anti-spam protection triggered');
                lastError428 = Date.now();
                connectionAttempts++;
                
                // Clear auth after multiple 428 errors to get fresh session
                if (connectionAttempts >= 5) {
                    console.log('🗑️ Too many 428 errors, clearing auth session for fresh start...');
                    const authPath = path.join(__dirname, 'auth_info');
                    if (fs.existsSync(authPath)) {
                        fs.rmSync(authPath, { recursive: true, force: true });
                        console.log('✅ Auth session cleared, will generate new QR');
                    }
                    connectionAttempts = 0; // Reset counter
                }
                
                // More conservative exponential backoff: 2 min, 5 min, 10 min, 15 min
                const backoffDelay = Math.min(120000 * Math.pow(1.5, connectionAttempts - 1), 900000);
                console.log(`🕐 Waiting ${Math.round(backoffDelay/1000)} seconds before retry (attempt ${connectionAttempts})...`);
                setTimeout(() => {
                    startSock();
                }, backoffDelay);
            } else if (shouldReconnect && statusCode !== 401 && process.env.NODE_ENV !== 'production') {
                console.log('🔄 Auto-reconnecting in 10 seconds...');
                setTimeout(() => {
                    startSock();
                }, 10000);
            } else if (statusCode === 401 && process.env.NODE_ENV !== 'production') {
                // For auth errors, restart with fresh session
                console.log('🔄 Starting fresh connection after auth failure...');
                setTimeout(() => {
                    startSock();
                }, 5000);
            } else if (process.env.NODE_ENV === 'production') {
                console.log('🔄 Connection will restart when needed (production mode)');
                // Reset sock to allow lazy loading
                sock = null;
            }
        }
    });

        sock.ev.on('creds.update', saveCreds);
    } catch (error) {
        console.error('❌ Error starting WhatsApp socket:', error);
        connectionState.connected = false;
        connectionState.qrCode = null;
        connectionState.phone = null;
    }
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Get connection status
app.get('/status', async (req, res) => {
    // Initialize WhatsApp connection if not already started
    if (!sock && !connectionState.connected && process.env.NODE_ENV === 'production') {
        console.log('🔄 Lazy loading WhatsApp connection...');
        try {
            startSock();
        } catch (error) {
            console.error('❌ Error starting WhatsApp:', error);
        }
    }
    
    let qrCodeData = null;
    if (connectionState.qrCode) {
        try {
            qrCodeData = await QRCode.toDataURL(connectionState.qrCode);
        } catch (error) {
            console.error('Error generating QR code:', error);
        }
    }
    
    res.json({
        connected: connectionState.connected,
        qr: connectionState.qrCode,
        qrImage: qrCodeData,
        phone: connectionState.phone,
        server: 'ready'
    });
});

// Campaign management endpoints
app.get('/api/campaigns', (req, res) => {
    res.json({
        ongoing: campaigns.ongoing,
        completed: campaigns.completed,
        scheduled: campaigns.scheduled
    });
});

app.post('/api/campaigns', (req, res) => {
    try {
        const campaign = {
            id: Date.now().toString(),
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: req.body.createdBy || 'Unknown User'
        };

        // Add to appropriate category
        if (campaign.status === 'ongoing') {
            campaigns.ongoing.push(campaign);
        } else if (campaign.status === 'completed') {
            campaigns.completed.push(campaign);
        } else if (campaign.status === 'scheduled') {
            campaigns.scheduled.push(campaign);
        }

        saveCampaigns();
        console.log('📊 New campaign added:', campaign.name, 'Status:', campaign.status);
        
        res.json({ success: true, campaign });
    } catch (error) {
        console.error('Error saving campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/campaigns/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Find campaign in all categories
        let found = false;
        let oldCategory = null;
        let newCategory = updates.status;

        ['ongoing', 'completed', 'scheduled'].forEach(category => {
            const index = campaigns[category].findIndex(c => c.id === id);
            if (index !== -1) {
                oldCategory = category;
                // Update the campaign
                campaigns[category][index] = {
                    ...campaigns[category][index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                
                // Move to different category if status changed
                if (newCategory && newCategory !== category) {
                    const campaign = campaigns[category].splice(index, 1)[0];
                    campaign.status = newCategory;
                    campaigns[newCategory].push(campaign);
                    console.log('📋 Campaign moved from', category, 'to', newCategory);
                }
                
                found = true;
                console.log('📝 Campaign updated:', campaigns[newCategory || category].find(c => c.id === id).name);
            }
        });

        if (found) {
            saveCampaigns();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Campaign not found' });
        }
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/campaigns/:id', (req, res) => {
    try {
        const { id } = req.params;
        let found = false;

        ['ongoing', 'completed', 'scheduled'].forEach(category => {
            const index = campaigns[category].findIndex(c => c.id === id);
            if (index !== -1) {
                const campaign = campaigns[category].splice(index, 1)[0];
                found = true;
                console.log('🗑️ Campaign deleted:', campaign.name);
            }
        });

        if (found) {
            saveCampaigns();
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: 'Campaign not found' });
        }
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Human-like typing simulation
async function simulateTyping(jid, duration = 2000) {
    try {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, duration));
        await sock.sendPresenceUpdate('paused', jid);
    } catch (error) {
        console.log('Typing simulation error:', error.message);
    }
}

// Generate random delay for human-like behavior
function getRandomDelay(min = 10000, max = 60000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Add subtle message variations to avoid pattern detection
function addMessageVariation(message) {
    const variations = [
        '', // No change (50% chance)
        '', 
        '', 
        '', 
        '\n', // Add line break at end
        ' ', // Add space at end  
        '😊', // Add simple emoji
        '🙏', // Prayer emoji
        '✨', // Sparkle emoji
        '\n\nSalam,', // Add closing
        '\n\nTerima kasih,', // Thank you closing
        '\n\nSemoga bermanfaat!', // Hope it's useful
        '\n\n--', // Simple signature
    ];
    
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    return message + randomVariation;
}

// Enhanced anti-ban safeguards
function validateSendingRate(lastSendTime) {
    const now = Date.now();
    const timeSinceLastSend = now - (lastSendTime || 0);
    const minimumInterval = 8000; // Minimum 8 seconds between sends
    
    if (timeSinceLastSend < minimumInterval) {
        const waitTime = minimumInterval - timeSinceLastSend;
        console.log(`⚠️ Rate limiting: waiting additional ${waitTime}ms`);
        return waitTime;
    }
    
    return 0;
}

// Track last send time for rate limiting
let lastMessageSendTime = 0;

// Endpoint kirim pesan
app.post('/send', upload.single('image'), async (req, res) => {
    const { nomor, pesan, nama, useHumanBehavior = true } = req.body;
    const imageFile = req.file;
    
    if (!nomor || !pesan) {
        return res.status(400).json({ status: false, message: "Nomor & pesan wajib diisi" });
    }

    if (!connectionState.connected || !sock) {
        return res.status(503).json({ status: false, message: "WhatsApp not connected" });
    }

    let target = nomor.toString().replace(/\D/g, '');
    if (target.startsWith('0')) {
        target = '62' + target.slice(1);
    } else if (!target.startsWith('62')) {
        target = '62' + target;
    }

    try {
        const jid = target + '@s.whatsapp.net';
        
        // Personalize message with contact name
        let personalizedMessage = pesan;
        if (nama) {
            personalizedMessage = pesan.replace(/\{\{nama\}\}/g, nama);
        }
        
        // Add subtle variations if human behavior is enabled
        if (useHumanBehavior) {
            personalizedMessage = addMessageVariation(personalizedMessage);
            
            // Validate sending rate to prevent too frequent sends
            const additionalWait = validateSendingRate(lastMessageSendTime);
            if (additionalWait > 0) {
                await new Promise(resolve => setTimeout(resolve, additionalWait));
            }
            
            // Simulate typing for 2-5 seconds
            const typingDuration = Math.floor(Math.random() * 3000) + 2000;
            console.log(`⌨️ Simulating typing for ${typingDuration}ms to ${target}`);
            await simulateTyping(jid, typingDuration);
        }
        let messageContent;
        
        if (imageFile) {
            // Send message with image
            const imagePath = imageFile.path;
            const imageBuffer = fs.readFileSync(imagePath);
            
            messageContent = {
                image: imageBuffer,
                caption: personalizedMessage
            };
            
            // Clean up the uploaded file after reading
            fs.unlinkSync(imagePath);
        } else {
            // Send text-only message
            messageContent = { text: personalizedMessage };
        }
        
        await sock.sendMessage(target + '@s.whatsapp.net', messageContent);
        // Update last send time for rate limiting
        lastMessageSendTime = Date.now();
        
        console.log(`✅ Pesan terkirim ke ${target}`);
        res.json({ status: true, message: "Pesan terkirim" });
    } catch (e) {
        console.error(`❌ Gagal kirim ke ${target}`, e);
        
        // Clean up file if it exists and there was an error
        if (imageFile && fs.existsSync(imageFile.path)) {
            fs.unlinkSync(imageFile.path);
        }
        
        res.status(500).json({ status: false, message: "Gagal kirim" });
    }
});

// Force reconnect endpoint (for when QR gets stuck)
app.post('/reconnect', async (req, res) => {
    try {
        console.log('🔄 Force reconnecting...');
        
        // Close existing connection if any
        if (sock) {
            try {
                await sock.end();
            } catch (e) {
                console.log('Error closing existing connection:', e.message);
            }
            sock = null;
        }
        
        // Clear auth info to force fresh QR code
        const authPath = path.join(__dirname, 'auth_info');
        if (fs.existsSync(authPath)) {
            console.log('🗑️ Clearing old auth session for fresh start...');
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        // Reset connection state
        connectionState = {
            connected: false,
            qrCode: null,
            phone: null
        };
        
        console.log('✅ Starting fresh connection...');
        res.json({ success: true, message: "Reconnection initiated" });
        
        // Start new connection
        setTimeout(() => {
            startSock();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Reconnect error:', error);
        res.status(500).json({ success: false, message: "Reconnect failed" });
    }
});

// Logout endpoint
app.post('/logout', async (req, res) => {
    try {
        console.log('🚪 Logging out from WhatsApp...');
        
        // Close the connection if exists
        if (sock) {
            try {
                await sock.logout();
            } catch (e) {
                console.log('Logout error (continuing anyway):', e.message);
            }
            sock = null;
        }
        
        // Clear auth info to force new QR code
        const authPath = path.join(__dirname, 'auth_info');
        if (fs.existsSync(authPath)) {
            console.log('🗑️ Clearing auth session...');
            fs.rmSync(authPath, { recursive: true, force: true });
        }
        
        // Update connection state
        connectionState = {
            connected: false,
            qrCode: null,
            phone: null
        };
        
        console.log('✅ Successfully logged out and cleared session');
        res.json({ success: true, message: "Logged out successfully" });
        
        // Restart socket for new connection after a delay
        setTimeout(() => {
            console.log('🔄 Starting fresh connection...');
            startSock();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
});

const PORT = process.env.PORT || 3000;

// Add error handling for server startup
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📱 WhatsApp connection will initialize when needed...`);
    
    // Delay WhatsApp initialization to avoid memory issues on startup
    if (process.env.NODE_ENV !== 'production') {
        // Only auto-start in development
        setTimeout(() => {
            try {
                console.log('🔄 Starting WhatsApp connection...');
                startSock();
            } catch (error) {
                console.error('❌ Error initializing WhatsApp:', error);
            }
        }, 3000);
    }
});

// Handle server errors
server.on('error', (error) => {
    console.error('❌ Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    if (sock) {
        try {
            sock.end();
        } catch (error) {
            console.log('Error closing WhatsApp connection:', error.message);
        }
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    if (sock) {
        try {
            sock.end();
        } catch (error) {
            console.log('Error closing WhatsApp connection:', error.message);
        }
    }
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // Don't exit immediately, log the error
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit immediately, log the error
});
