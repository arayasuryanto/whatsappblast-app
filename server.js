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
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    sock = makeWASocket({
        auth: state,
        browser: ["Windows", "Chrome", "10"]
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr, lastDisconnect } = update;
        
        if (qr) {
            console.log("Scan QR berikut untuk login:");
            qrcode.generate(qr, { small: true });
            connectionState.qrCode = qr;
            connectionState.connected = false;
        }
        
        if (connection === 'open') {
            console.log('✅ WhatsApp Connected');
            connectionState.connected = true;
            connectionState.qrCode = null;
            connectionState.phone = sock.user?.id?.split(':')[0];
        }
        
        if (connection === 'close') {
            console.log('❌ WhatsApp Disconnected');
            connectionState.connected = false;
            connectionState.phone = null;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('🔄 Reconnecting...');
                startSock();
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
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

// Endpoint kirim pesan
app.post('/send', upload.single('image'), async (req, res) => {
    const { nomor, pesan } = req.body;
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
        let messageContent;
        
        if (imageFile) {
            // Send message with image
            const imagePath = imageFile.path;
            const imageBuffer = fs.readFileSync(imagePath);
            
            messageContent = {
                image: imageBuffer,
                caption: pesan
            };
            
            // Clean up the uploaded file after reading
            fs.unlinkSync(imagePath);
        } else {
            // Send text-only message
            messageContent = { text: pesan };
        }
        
        await sock.sendMessage(target + '@s.whatsapp.net', messageContent);
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
        }, 1000);
        
    } catch (error) {
        console.error('❌ Reconnect error:', error);
        res.status(500).json({ success: false, message: "Reconnect failed" });
    }
});

// Logout endpoint
app.post('/logout', async (req, res) => {
    try {
        if (!sock) {
            return res.json({ success: false, message: "No active connection" });
        }

        console.log('🚪 Logging out from WhatsApp...');
        
        // Close the connection
        await sock.logout();
        sock = null;
        
        // Update connection state
        connectionState = {
            connected: false,
            qrCode: null,
            phone: null
        };
        
        console.log('✅ Successfully logged out from WhatsApp');
        res.json({ success: true, message: "Logged out successfully" });
        
        // Restart socket for new connection
        setTimeout(() => {
            startSock();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
});

app.listen(3000, () => {
    console.log("✅ Server berjalan di http://localhost:3000");
    startSock();
});
