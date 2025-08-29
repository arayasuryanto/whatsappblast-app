// Ultra minimal test server for Railway
const http = require('http');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting ultra minimal test server...');
console.log(`📝 Node version: ${process.version}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📂 Current directory: ${process.cwd()}`);
console.log(`📋 Files in directory:`, fs.readdirSync('.').slice(0, 10));

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    console.log(`📥 Request: ${req.method} ${req.url}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            node: process.version,
            port: PORT,
            message: 'Ultra minimal server is running'
        }));
    } else if (req.url === '/' || req.url === '/index.html') {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            fs.createReadStream(indexPath).pipe(res);
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head><title>Test Server</title></head>
                <body>
                    <h1>✅ Ultra Minimal Server Running!</h1>
                    <p>Node version: ${process.version}</p>
                    <p>Port: ${PORT}</p>
                    <p>Time: ${new Date().toISOString()}</p>
                    <p>Uptime: ${process.uptime()}s</p>
                    <p><a href="/health">Health Check</a></p>
                    <p>This proves Railway can run Node.js apps successfully.</p>
                </body>
                </html>
            `);
        }
    } else if (req.url.startsWith('/status')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            connected: false,
            server: 'test-mode',
            message: 'Ultra minimal server - no WhatsApp'
        }));
    } else {
        // Try to serve static files
        const filePath = path.join(__dirname, req.url);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath);
            const contentType = {
                '.js': 'application/javascript',
                '.css': 'text/css',
                '.html': 'text/html',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.json': 'application/json'
            }[ext] || 'text/plain';
            
            res.writeHead(200, { 'Content-Type': contentType });
            fs.createReadStream(filePath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Ultra minimal server running on port ${PORT}`);
    console.log(`🏠 Access at: http://localhost:${PORT}`);
    console.log(`❤️ Health check: http://localhost:${PORT}/health`);
    console.log('🎯 Server is ready and listening...');
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

// Log any uncaught errors
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    process.exit(1);
});

console.log('🔥 Ultra minimal server initialized successfully');