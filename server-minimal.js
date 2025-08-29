// Minimal server for Railway deployment testing
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        message: 'Server is running'
    });
});

// Main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Basic status endpoint (without WhatsApp)
app.get('/status', (req, res) => {
    res.json({
        connected: false,
        qr: null,
        qrImage: null,
        phone: null,
        server: 'ready',
        message: 'WhatsApp not initialized yet'
    });
});

// Dummy send endpoint
app.post('/send', (req, res) => {
    res.status(503).json({
        status: false,
        message: "WhatsApp not connected - this is a minimal server"
    });
});

const PORT = process.env.PORT || 3000;

console.log('🚀 Starting minimal server...');
console.log(`📝 Node version: ${process.version}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Minimal server running on port ${PORT}`);
    console.log(`🏠 Access at: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('📴 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

console.log('🎯 Minimal server ready - no WhatsApp dependencies');