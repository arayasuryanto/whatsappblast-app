const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const express = require('express');
const bodyParser = require('body-parser');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

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

async function startSock() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        sock = makeWASocket({
            auth: state,
            browser: ["Windows", "Chrome", "112.0.0.0"],
            connectTimeoutMs: 120000, // Increased to 2 minutes
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            printQRInTerminal: false,
            qrTimeout: 60000, // QR timeout 60 seconds
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false
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
            
            if (shouldReconnect && statusCode !== 401) {
                console.log('🔄 Auto-reconnecting in 5 seconds...');
                setTimeout(() => {
                    startSock();
                }, 5000);
            } else if (statusCode === 401) {
                // For auth errors, restart with fresh session
                console.log('🔄 Starting fresh connection after auth failure...');
                setTimeout(() => {
                    startSock();
                }, 3000);
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
        phone: connectionState.phone
    });
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

const PORT = process.env.PORT || 1;
app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
    startSock();
});
