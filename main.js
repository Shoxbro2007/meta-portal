// Подключение к серверу
const socket = io();

// Элементы DOM
const chatCanvas = document.getElementById('chatCanvas');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const voiceVisualizer = document.getElementById('voiceVisualizer');
const themeBtn = document.getElementById('themeBtn');
const zenModeBtn = document.getElementById('zenModeBtn');
const scoreVal = document.getElementById('scoreVal');
const emptyState = document.getElementById('emptyState');
const toastContainer = document.getElementById('toastContainer');

// Состояние приложения
let state = {
    username: 'User' + Math.floor(Math.random() * 1000),
    score: 0,
    isZenMode: false,
    isRecording: false,
    messages: [],
    bubbles: []
};

// Инициализация
function init() {
    setupEventListeners();
    loadSettings();
    
    // Загрузка истории сообщений
    socket.emit('getHistory');
}

// Настройка обработчиков событий
function setupEventListeners() {
    sendBtn.addEventListener('click', sendMessage);
    msgInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Голосовые сообщения
    voiceBtn.addEventListener('mousedown', startRecording);
    voiceBtn.addEventListener('mouseup', stopRecording);
    voiceBtn.addEventListener('mouseleave', stopRecording);
    
    // Тач-события для мобильных
    voiceBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startRecording();
    });
    voiceBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopRecording();
    });
    
    // Кнопки управления
    themeBtn.addEventListener('click', toggleTheme);
    zenModeBtn.addEventListener('click', toggleZenMode);
    
    // Сокет события
    socket.on('message', handleNewMessage);
    socket.on('history', handleHistory);
    socket.on('userCount', updateUserCount);
}

// Отправка сообщения
function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;
    
    const message = {
        id: Date.now(),
        author: state.username,
        text: state.isZenMode ? extractEmojis(text) : text,
        timestamp: new Date().toISOString(),
        emotion: detectEmotion(text),
        type: state.isZenMode ? 'zen' : 'text'
    };
    
    socket.emit('message', message);
    msgInput.value = '';
    addScore(10);
}

// Извлечение эмодзи
function extractEmojis(text) {
    const emojiRegex = /[\p{Emoji}]/u;
    const emojis = text.match(emojiRegex);
    return emojis ? emojis.join(' ') : '🌀';
}

// Определение эмоции
function detectEmotion(text) {
    const lower = text.toLowerCase();
    if (lower.includes('рад') || lower.includes('крут') || lower.includes('!') || lower.includes(':)')) return 'happy';
    if (lower.includes('груст') || lower.includes('плох') || lower.includes(':(')) return 'sad';
    if (lower.includes('зл') || lower.includes('бесит')) return 'angry';
    return 'neutral';
}

// Обработка нового сообщения
function handleNewMessage(message) {
    if (emptyState) emptyState.style.display = 'none';
    createMessageBubble(message);
    addScore(5);
}

// Создание пузыря сообщения
function createMessageBubble(message) {
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.dataset.id = message.id;
    
    // Случайная позиция
    const maxX = chatCanvas.clientWidth - 320;
    const maxY = chatCanvas.clientHeight - 100;
    const x = Math.random() * maxX;
    const y = Math.random() * maxY;
    
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    
    // Цвет в зависимости от эмоции
    let borderColor = 'var(--glass-border)';
    if (message.emotion === 'happy') borderColor = '#00cec9';
    if (message.emotion === 'sad') borderColor = '#6c5ce7';
    if (message.emotion === 'angry') borderColor = '#fd79a8';
    bubble.style.borderColor = borderColor;
    
    bubble.innerHTML = `
        <div class="author">${message.author}</div>
        <div class="text">${message.text}</div>
        <div class="time">${new Date(message.timestamp).toLocaleTimeString()}</div>
    `;
    
    // Клик для фокусировки
    bubble.addEventListener('click', () => focusBubble(bubble));
    
    chatCanvas.appendChild(bubble);
    state.bubbles.push({ element: bubble, x, y, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
    
    // Анимация появления
    bubble.style.opacity = '0';
    bubble.style.transform = 'scale(0.8)';
    setTimeout(() => {
        bubble.style.opacity = '1';
        bubble.style.transform = 'scale(1)';
    }, 10);
}

// Фокус на пузыре
function focusBubble(focusedBubble) {
    state.bubbles.forEach(b => {
        if (b.element !== focusedBubble) {
            b.element.classList.remove('focused');
            b.element.style.opacity = '0.3';
        } else {
            b.element.classList.add('focused');
            b.element.style.opacity = '1';
        }
    });
    
    // Снять фокус при клике вне
    setTimeout(() => {
        document.addEventListener('click', function unfocus(e) {
            if (!e.target.closest('.message-bubble')) {
                state.bubbles.forEach(b => {
                    b.element.classList.remove('focused');
                    b.element.style.opacity = '1';
                });
                document.removeEventListener('click', unfocus);
            }
        });
    }, 100);
}

// Обработка истории
function handleHistory(messages) {
    messages.forEach(msg => {
        if (emptyState) emptyState.style.display = 'none';
        createMessageBubble(msg);
    });
}

// Обновление счета
function addScore(points) {
    state.score += points;
    scoreVal.textContent = state.score;
    
    // Проверка достижений
    if (state.score >= 100) showToast('🏆 Достигнут уровень 100!');
    if (state.score >= 500) showToast('🌟 Мастер чата!');
}

// Уведомления
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Переключение темы
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

// Режим дзен
function toggleZenMode() {
    state.isZenMode = !state.isZenMode;
    zenModeBtn.style.background = state.isZenMode ? 'var(--secondary)' : '';
    msgInput.placeholder = state.isZenMode ? 'Только эмодзи...' : 'Мысль вслух...';
    showToast(state.isZenMode ? '🧘 Режим Дзен включен' : '💬 Обычный режим');
}

// Запись голоса (имитация)
function startRecording() {
    state.isRecording = true;
    voiceVisualizer.classList.remove('hidden');
    voiceBtn.style.transform = 'scale(0.9)';
}

function stopRecording() {
    if (!state.isRecording) return;
    state.isRecording = false;
    voiceVisualizer.classList.add('hidden');
    voiceBtn.style.transform = 'scale(1)';
    
    // Отправка голосового сообщения (имитация)
    const message = {
        id: Date.now(),
        author: state.username,
        text: '🎤 Голосовое сообщение',
        timestamp: new Date().toISOString(),
        emotion: 'neutral',
        type: 'voice'
    };
    
    socket.emit('message', message);
    addScore(15);
}

// Обновление счетчика пользователей
function updateUserCount(count) {
    // Можно добавить индикатор онлайн
}

// Загрузка настроек
function loadSettings() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
    }
}

// Анимация дрейфа пузырей
function animateBubbles() {
    const canvasWidth = chatCanvas.clientWidth;
    const canvasHeight = chatCanvas.clientHeight;
    
    state.bubbles.forEach(bubble => {
        if (bubble.element.classList.contains('focused')) return;
        
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;
        
        // Отталкивание от краев
        if (bubble.x <= 0 || bubble.x >= canvasWidth - 300) {
            bubble.vx *= -1;
            bubble.x = Math.max(0, Math.min(bubble.x, canvasWidth - 300));
        }
        if (bubble.y <= 0 || bubble.y >= canvasHeight - 100) {
            bubble.vy *= -1;
            bubble.y = Math.max(0, Math.min(bubble.y, canvasHeight - 100));
        }
        
        bubble.element.style.left = bubble.x + 'px';
        bubble.element.style.top = bubble.y + 'px';
    });
    
    requestAnimationFrame(animateBubbles);
}

// Запуск
init();
animateBubbles();
