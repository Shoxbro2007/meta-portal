
// Simple WebSocket server using Node.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('chat-message', (msg) => {
    io.emit('chat-message', msg);
  });
});

server.listen(3000, () => {
  console.log('WebSocket server running on http://localhost:3000');
});
