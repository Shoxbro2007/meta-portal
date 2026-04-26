const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Хранилище данных
const messageHistory = []; // Последние 100 сообщений
const users = new Map(); // Активные пользователи

// Раздача статических файлов
app.use(express.static(path.join(__dirname)));

// Обработка подключения Socket.IO
io.on('connection', (socket) => {
    console.log(`Новое подключение: ${socket.id}`);

    // Отправляем историю при подключении
    socket.emit('chat_history', messageHistory);

    // Обработка входа пользователя
    socket.on('join', (data) => {
        const username = data.username || 'Аноним';
        users.set(socket.id, { id: socket.id, username, joinedAt: Date.now() });
        
        console.log(`${username} присоединился`);
        
        // Уведомляем остальных
        socket.broadcast.emit('user_joined', {
            username: username,
            userId: socket.id
        });
    });

    // Обработка сообщения чата
    socket.on('chat_message', (data) => {
        const user = users.get(socket.id);
        const username = user ? user.username : 'Аноним';
        
        const message = {
            id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
            username: username,
            text: data.text,
            timestamp: data.timestamp || Date.now(),
            userId: socket.id
        };

        // Добавляем в историю
        messageHistory.push(message);
        
        // Ограничиваем историю 100 сообщениями
        if (messageHistory.length > 100) {
            messageHistory.shift();
        }

        // Рассылаем всем подключенным
        io.emit('new_message', message);
    });

    // Изменение имени пользователя
    socket.on('username_change', (newUsername) => {
        const user = users.get(socket.id);
        if (user) {
            user.username = newUsername;
            users.set(socket.id, user);
            console.log(`${socket.id} сменил имя на ${newUsername}`);
        }
    });

    // Обработка отключения
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);
            console.log(`${user.username} отключился`);
            
            io.emit('user_left', {
                username: user.username,
                userId: socket.id
            });
        }
    });
});

// Запуск сервера
server.listen(PORT, () => {
    console.log(`\n🚀 Meta Portal Flow запущен!`);
    console.log(`📍 Откройте в браузере: http://localhost:${PORT}\n`);
});
