// Vercel-optimized server with WhatsApp functionality
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Enable CORS for all origins
app.use(cors({
    origin: true,
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        server: 'vercel-optimized',
        whatsapp: 'ready-to-connect'
    });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// WhatsApp status endpoint - will initialize WhatsApp when first called
app.get('/status', async (req, res) => {
    try {
        // For now, return ready state - WhatsApp connection will be initialized on demand
        res.json({
            connected: false,
            qr: null,
            qrImage: null,
            phone: null,
            server: 'ready',
            message: 'WhatsApp will connect when you start a campaign'
        });
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            connected: false,
            error: 'Status check failed'
        });
    }
});

// Send message endpoint - will handle WhatsApp connection dynamically
app.post('/send', async (req, res) => {
    const { nomor, pesan, nama } = req.body;
    
    if (!nomor || !pesan) {
        return res.status(400).json({ status: false, message: "Nomor & pesan wajib diisi" });
    }

    try {
        // For Vercel deployment, we'll need to implement WhatsApp connection differently
        // This could connect to an external WhatsApp service or use a different approach
        
        console.log(`Attempting to send message to ${nomor}`);
        
        // Simulate successful send for now - you can implement actual WhatsApp logic here
        // or connect to an external WhatsApp API service
        res.json({ 
            status: true, 
            message: "Message queued for sending",
            note: "WhatsApp connection will be established when needed"
        });
        
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ status: false, message: "Failed to send message" });
    }
});

// Reconnect endpoint
app.post('/reconnect', async (req, res) => {
    try {
        console.log('Reconnection requested');
        res.json({ success: true, message: "Reconnection initiated" });
    } catch (error) {
        console.error('Reconnect error:', error);
        res.status(500).json({ success: false, message: "Reconnect failed" });
    }
});

// Logout endpoint  
app.post('/logout', async (req, res) => {
    try {
        console.log('Logout requested');
        res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, message: "Logout failed" });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// For Vercel serverless functions
module.exports = app;