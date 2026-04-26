// Meta Portal - Complete WebSocket Server
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static(path.join(__dirname)));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// In-memory storage
let users = new Map(); // socket.id -> user data
let chatHistory = [];
const MAX_HISTORY = 50;

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Initialize user data
    users.set(socket.id, {
        id: socket.id,
        username: 'Аноним',
        avatar: '👤',
        joinedAt: new Date().toISOString()
    });

    // Send chat history to new user
    socket.emit('chat-history', chatHistory);
    
    // Broadcast updated online count
    broadcastOnlineCount();

    // Notify others about new user
    const userData = users.get(socket.id);
    socket.broadcast.emit('user-joined', {
        username: userData.username,
        userId: socket.id
    });

    // Handle user info update
    socket.on('user-info', (data) => {
        const user = users.get(socket.id);
        if (user) {
            user.username = data.username || 'Аноним';
            user.avatar = data.avatar || '👤';
            users.set(socket.id, user);
            console.log(`User ${socket.id} updated info:`, user.username);
        }
    });

    // Handle chat messages
    socket.on('chat-message', (msg) => {
        const user = users.get(socket.id);
        const messageData = {
            id: Date.now(),
            username: user ? user.username : 'Аноним',
            avatar: user ? user.avatar : '👤',
            text: msg.text || msg,
            timestamp: new Date().toISOString(),
            userId: socket.id,
            own: msg.own || false
        };

        // Add to history
        chatHistory.push(messageData);
        if (chatHistory.length > MAX_HISTORY) {
            chatHistory.shift();
        }

        // Broadcast to all clients
        io.emit('chat-message', messageData);
        console.log(`Message from ${messageData.username}:`, messageData.text);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        console.log('User disconnected:', socket.id);
        
        if (user) {
            users.delete(socket.id);
            socket.broadcast.emit('user-left', {
                username: user.username,
                userId: socket.id
            });
        }
        
        broadcastOnlineCount();
    });
});

// Broadcast online user count
function broadcastOnlineCount() {
    const count = users.size;
    io.emit('online-count', count);
}

// Error handling
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║     🌐 Meta Portal Server Started!           ║
║                                               ║
║     URL: http://localhost:${PORT}              ║
║     Status: Online ✅                         ║
║     Users: 0                                  ║
╚═══════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server, io };
