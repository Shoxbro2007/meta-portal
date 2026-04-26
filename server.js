const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Хранилище сообщений (в памяти)
let messageHistory = [];
const MAX_HISTORY = 50;

// Подключенные пользователи
let users = new Set();

io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);
    users.add(socket.id);
    
    // Отправка количества пользователей
    io.emit('userCount', users.size);
    
    // Отправка истории сообщений
    socket.emit('history', messageHistory);
    
    // Обработка нового сообщения
    socket.on('message', (message) => {
        // Добавляем в историю
        messageHistory.push(message);
        if (messageHistory.length > MAX_HISTORY) {
            messageHistory.shift();
        }
        
        // Рассылка всем подключенным
        io.emit('message', message);
    });
    
    // Запрос истории
    socket.on('getHistory', () => {
        socket.emit('history', messageHistory);
    });
    
    // Отключение
    socket.on('disconnect', () => {
        console.log('Пользователь отключился:', socket.id);
        users.delete(socket.id);
        io.emit('userCount', users.size);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Meta Portal 2.0 запущен на http://localhost:${PORT}`);
});
