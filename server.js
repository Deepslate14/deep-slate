import express from 'express';
import { createServer } from 'http';
import { uvPath } from '@titaniumnetwork-dev/ultraviolet';
import { createBareServer } from '@tomphttp/bare-server-node';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { attachChat } from './chat.js';

// Bypass strict SSL for local proxy routing
// SECURITY FIX: Disabling TLS verification globally is extremely dangerous and allows MitM attacks.
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer();
const bareServer = createBareServer('/bare/', {
    blockLocal: false,  // Allow all IPs (needed for YouTube/Google CDN)
    connectionLimiter: {
        maxConnectionsPerIP: 5000,  // Increased for public use to handle heavy media sites
        windowDuration: 60,
        blockDuration: 1,
    },
});

// Serve the Ultraviolet static files
app.use('/uv/', express.static(uvPath));

// Serve Bare-Mux
app.use('/baremux/', express.static(join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-mux', 'dist')));

// Serve Bare-as-module3 (the transport for bare-mux)
app.use('/bare-as-module3/', express.static(join(__dirname, 'node_modules', '@mercuryworkshop', 'bare-as-module3', 'dist')));

// Serve our own static frontend files
app.use(express.static(join(__dirname, 'public')));

// Catch-all to serve index.html for routing
app.get(/^.*$/, (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
});

server.on('request', (req, res) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bareServer.shouldRoute(req)) {
        bareServer.routeUpgrade(req, socket, head);
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use.`);
        console.error(`💡 Try closing other terminal windows or change the port in server.js.\n`);
    } else {
        console.error('❌ Server error:', err);
    }
    process.exit(1);
});

const PORT = process.env.PORT || 8080;
attachChat(server);
server.listen(PORT, () => {
    console.log(`\n╔═════════════════════════════════════════════╗`);
    console.log('✅ Deep Slate: V1.5 (SEARCH POPUP) LOADED');
    console.log(`╚═════════════════════════════════════════════╝`);
    console.log(`\nServer is listening on port ${PORT}\n`);
});
