const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e8 // 100MB для голосовых
});

const PORT = process.env.PORT || 3000;
const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = { achievements: [], avatars: [] };
try {
    if (fs.existsSync(CONFIG_PATH)) {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
} catch (err) { console.error('Config error:', err); }

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '100mb' }));

// Хранилище состояния
const state = {
    users: new Map(),
    messages: [],
    maxMessages: 100
};

function getRandomPosition() {
    return { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 };
}

io.on('connection', (socket) => {
    console.log(`🔌 Подключение: ${socket.id}`);

    socket.emit('init', {
        messages: state.messages,
        config: config,
        users: Array.from(state.users.values())
    });

    socket.on('join', (data) => {
        const userInfo = {
            id: socket.id,
            name: data.name || 'Аноним',
            avatar: data.avatar || (config.avatars[0]?.url || 'default'),
            mood: 'neutral',
            mode: data.mode || 'chat',
            color: data.color || '#' + Math.floor(Math.random()*16777215).toString(16),
            score: 0,
            ...getRandomPosition()
        };
        
        state.users.set(socket.id, userInfo);
        io.emit('userJoined', userInfo);
        broadcastUserList();
        console.log(`👤 ${userInfo.name} вошёл в поток`);
    });

    socket.on('chatMessage', (msgData) => {
        const user = state.users.get(socket.id);
        if (!user) return;

        // Анализ настроения
        const text = (msgData.text || '').toLowerCase();
        let detectedMood = 'neutral';
        if (/[!?]{2,}|рад|круто|супер|люблю|😍|🔥|🚀|❤️/.test(text)) detectedMood = 'happy';
        if (/груст|устал|плохо|😭|💔|😞|😢/.test(text)) detectedMood = 'sad';
        if (/зл|бесит|ненавижу|😡|🤬|👎|💢/.test(text)) detectedMood = 'angry';
        if (/дзен|тишина|спокой|🧘|🌸|✨/.test(text)) detectedMood = 'zen';
        
        if (user.mood !== detectedMood) {
            user.mood = detectedMood;
            io.emit('userMoodChanged', { userId: socket.id, mood: detectedMood });
        }

        const message = {
            id: Date.now().toString() + '-' + socket.id.substr(0,4),
            userId: socket.id,
            userName: user.name,
            userAvatar: user.avatar,
            userColor: user.color,
            text: msgData.text,
            type: msgData.type || 'text',
            voiceData: msgData.voiceData || null,
            timestamp: Date.now(),
            x: msgData.x || (Math.random() * 80 + 10),
            y: msgData.y || (Math.random() * 80 + 10),
            rotation: Math.random() * 10 - 5,
            scale: 1,
            mood: detectedMood
        };

        state.messages.push(message);
        if (state.messages.length > state.maxMessages) state.messages.shift();

        io.emit('newMessage', message);
        
        // Геймификация
        user.score += (msgData.type === 'voice' ? 2 : 1);
        socket.emit('scoreUpdate', user.score);
        
        // Достижения
        if (user.score === 10) socket.emit('achievementUnlocked', { id: 'first_steps', name: 'Первые шаги' });
        if (user.score === 50) socket.emit('achievementUnlocked', { id: 'talker', name: 'Душа компании' });
        if (msgData.type === 'voice') socket.emit('achievementProgress', { type: 'voice', count: 1 });
    });

    socket.on('voiceMessage', (data) => {
        // Обработка голосового сообщения
        socket.emit('chatMessage', {
            text: '🎤 Голосовое сообщение',
            type: 'voice',
            voiceData: data.audioBlob
        });
    });

    socket.on('updatePosition', (data) => {
        const user = state.users.get(socket.id);
        if (user) {
            user.x = data.x;
            user.y = data.y;
            socket.broadcast.emit('userMoved', { userId: socket.id, x: data.x, y: data.y });
        }
    });

    socket.on('setMode', (mode) => {
        const user = state.users.get(socket.id);
        if (user) {
            user.mode = mode;
            io.emit('userModeChanged', { userId: socket.id, mode });
        }
    });

    socket.on('zenEmoji', (emoji) => {
        const user = state.users.get(socket.id);
        if (!user) return;
        
        const message = {
            id: Date.now().toString(),
            userId: socket.id,
            userName: user.name,
            userColor: user.color,
            text: emoji,
            type: 'zen',
            timestamp: Date.now(),
            x: Math.random() * 80 + 10,
            y: Math.random() * 80 + 10,
            rotation: Math.random() * 360,
            scale: 1.5,
            mood: 'zen'
        };
        
        state.messages.push(message);
        if (state.messages.length > state.maxMessages) state.messages.shift();
        io.emit('newMessage', message);
    });

    socket.on('disconnect', () => {
        const user = state.users.get(socket.id);
        if (user) {
            console.log(`👋 ${user.name} вышел`);
            state.users.delete(socket.id);
            io.emit('userLeft', socket.id);
            broadcastUserList();
        }
    });
});

function broadcastUserList() {
    io.emit('userList', Array.from(state.users.values()));
}

server.listen(PORT, () => {
    console.log(`\n🚀 META PORTAL 2.0 ЗАПУЩЕН!`);
    console.log(`🎨 Режим: Живой Холст + Эмоции + Дзен + Голос`);
    console.log(`📍 http://localhost:${PORT}\n`);
});
