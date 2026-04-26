// Meta Portal 2.0 - Клиентская логика
// Живой Холст + Эмоции + Дзен + Голосовые сообщения

const socket = io();

// Состояние приложения
const state = {
    currentUser: null,
    users: new Map(),
    messages: [],
    config: null,
    score: 0,
    mode: 'chat',
    theme: 'dark',
    driftSpeed: 1,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: []
};

// DOM элементы
const elements = {};

// Инициализация
function init() {
    cacheElements();
    setupEventListeners();
    loadSettings();
    showLoginModal();
}

function cacheElements() {
    elements.app = document.getElementById('app');
    elements.canvas = document.getElementById('canvas');
    elements.loginModal = document.getElementById('login-modal');
    elements.loginForm = document.getElementById('login-form');
    elements.usernameInput = document.getElementById('username');
    elements.colorPicker = document.getElementById('color-picker');
    elements.modeToggle = document.getElementById('mode-toggle');
    elements.themeToggle = document.getElementById('theme-toggle');
    elements.chatInput = document.getElementById('chat-input');
    elements.sendBtn = document.getElementById('send-btn');
    elements.voiceBtn = document.getElementById('voice-btn');
    elements.voiceVisualizer = document.getElementById('voice-visualizer');
    elements.settingsPanel = document.getElementById('settings-panel');
    elements.scoreDisplay = document.getElementById('score-display');
    elements.userCount = document.getElementById('user-count');
    elements.notifications = document.getElementById('notifications');
}

function setupEventListeners() {
    if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', handleLogin);
    }

    if (elements.sendBtn && elements.chatInput) {
        elements.sendBtn.addEventListener('click', sendMessage);
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    if (elements.voiceBtn) {
        elements.voiceBtn.addEventListener('mousedown', startRecording);
        elements.voiceBtn.addEventListener('mouseup', stopRecording);
        elements.voiceBtn.addEventListener('mouseleave', stopRecording);
        elements.voiceBtn.addEventListener('touchstart', startRecording);
        elements.voiceBtn.addEventListener('touchend', stopRecording);
    }

    if (elements.modeToggle) {
        elements.modeToggle.addEventListener('click', toggleMode);
    }

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    const speedSlider = document.getElementById('drift-speed');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            state.driftSpeed = parseFloat(e.target.value);
            saveSettings();
        });
    }

    const closeSettings = document.querySelector('.close-settings');
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            elements.settingsPanel?.classList.remove('active');
        });
    }

    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            elements.settingsPanel?.classList.add('active');
        });
    }

    animateCanvas();
}

function showLoginModal() {
    if (elements.loginModal) {
        elements.loginModal.classList.add('active');
        generateAvatarOptions();
    }
}

function generateAvatarOptions() {
    const container = document.getElementById('avatar-options');
    if (!container || !state.config) return;

    container.innerHTML = '';
    state.config.avatars.forEach((avatar) => {
        const div = document.createElement('div');
        div.className = 'avatar-option';
        div.dataset.avatar = avatar.url;
        div.innerHTML = `<img src="${avatar.url}" alt="${avatar.name}">`;
        div.addEventListener('click', () => {
            document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
        });
        container.appendChild(div);
    });

    if (container.firstChild) {
        container.firstChild.classList.add('selected');
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = elements.usernameInput?.value.trim() || 'Аноним';
    const selectedAvatar = document.querySelector('.avatar-option.selected');
    const avatar = selectedAvatar?.dataset.avatar || (state.config?.avatars[0]?.url || 'default');
    const color = elements.colorPicker?.value || '#' + Math.floor(Math.random()*16777215).toString(16);

    state.currentUser = { name: username, avatar, color };

    socket.emit('join', {
        name: username,
        avatar: avatar,
        color: color,
        mode: state.mode
    });

    if (elements.loginModal) {
        elements.loginModal.classList.remove('active');
    }

    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'block';
    }
}

function sendMessage() {
    const input = elements.chatInput;
    if (!input || !input.value.trim()) return;

    const text = input.value.trim();
    
    let mood = 'neutral';
    if (/[!?]{2,}|рад|круто|супер|люблю|😍|🔥|🚀|❤️/.test(text)) mood = 'happy';
    if (/груст|устал|плохо|😭|💔|😞|😢/.test(text)) mood = 'sad';
    if (/зл|бесит|ненавижу|😡|🤬|👎|💢/.test(text)) mood = 'angry';

    let x, y;
    if (mood === 'happy') {
        x = Math.random() * 80 + 10;
        y = Math.random() * 30 + 10;
    } else if (mood === 'sad') {
        x = Math.random() * 80 + 10;
        y = Math.random() * 30 + 60;
    } else {
        x = Math.random() * 80 + 10;
        y = Math.random() * 80 + 10;
    }

    socket.emit('chatMessage', {
        text: text,
        type: 'text',
        x: x,
        y: y
    });

    input.value = '';
    input.focus();
}

async function startRecording() {
    if (state.isRecording) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (event) => {
            state.audioChunks.push(event.data);
        };

        state.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64Audio = reader.result;
                socket.emit('chatMessage', {
                    text: '🎤 Голосовое сообщение',
                    type: 'voice',
                    voiceData: base64Audio
                });
            };
            
            stream.getTracks().forEach(track => track.stop());
        };

        state.mediaRecorder.start();
        state.isRecording = true;
        
        if (elements.voiceBtn) {
            elements.voiceBtn.classList.add('recording');
        }
        if (elements.voiceVisualizer) {
            elements.voiceVisualizer.style.display = 'block';
        }

    } catch (err) {
        console.error('Ошибка доступа к микрофону:', err);
        showNotification('❌ Нет доступа к микрофону', 'error');
    }
}

function stopRecording() {
    if (!state.isRecording || !state.mediaRecorder) return;

    state.mediaRecorder.stop();
    state.isRecording = false;
    
    if (elements.voiceBtn) {
        elements.voiceBtn.classList.remove('recording');
    }
    if (elements.voiceVisualizer) {
        setTimeout(() => {
            elements.voiceVisualizer.style.display = 'none';
        }, 500);
    }
}

function toggleMode() {
    state.mode = state.mode === 'chat' ? 'zen' : 'chat';
    socket.emit('setMode', state.mode);
    
    if (elements.modeToggle) {
        elements.modeToggle.textContent = state.mode === 'chat' ? '🧘 Режим Дзен' : '💬 Обычный чат';
    }

    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.classList.toggle('zen-mode', state.mode === 'zen');
    }

    showNotification(state.mode === 'zen' ? '🧘 Режим Дзен активирован' : '💬 Обычный режим', 'info');
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', state.theme === 'light');
    saveSettings();
}

function animateCanvas() {
    const bubbles = document.querySelectorAll('.message-bubble');
    
    bubbles.forEach(bubble => {
        const currentX = parseFloat(bubble.dataset.x) || 50;
        const currentY = parseFloat(bubble.dataset.y) || 50;
        
        let newX = currentX + (Math.random() - 0.5) * state.driftSpeed * 0.1;
        let newY = currentY + (Math.random() - 0.5) * state.driftSpeed * 0.1;
        
        if (newX < 5 || newX > 95) newX = currentX - (newX - currentX);
        if (newY < 5 || newY > 95) newY = currentY - (newY - currentY);
        
        newX = Math.max(5, Math.min(95, newX));
        newY = Math.max(5, Math.min(95, newY));
        
        bubble.style.left = newX + '%';
        bubble.style.top = newY + '%';
        bubble.dataset.x = newX;
        bubble.dataset.y = newY;
    });

    requestAnimationFrame(animateCanvas);
}

function createMessageBubble(message) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble mood-${message.mood}`;
    bubble.dataset.id = message.id;
    bubble.dataset.x = message.x;
    bubble.dataset.y = message.y;
    
    if (message.type === 'zen') {
        bubble.classList.add('zen-bubble');
        bubble.innerHTML = `<div class="zen-emoji">${message.text}</div>`;
    } else if (message.type === 'voice') {
        bubble.classList.add('voice-bubble');
        bubble.innerHTML = `
            <div class="avatar-mini" style="background-image: url(${message.userAvatar || 'default'})"></div>
            <div class="voice-wave">🎤</div>
            <div class="message-text">${message.userName}: Голосовое сообщение</div>
        `;
    } else {
        bubble.innerHTML = `
            <div class="avatar-mini" style="background-image: url(${message.userAvatar || 'default'}); border-color: ${message.userColor || '#fff'}"></div>
            <div class="message-author" style="color: ${message.userColor || '#fff'}">${message.userName}</div>
            <div class="message-text">${escapeHtml(message.text)}</div>
            <div class="message-mood">${getMoodEmoji(message.mood)}</div>
        `;
    }

    bubble.style.left = message.x + '%';
    bubble.style.top = message.y + '%';
    bubble.style.transform = `rotate(${message.rotation || 0}deg) scale(${message.scale || 1})`;

    bubble.addEventListener('click', () => {
        focusOnBubble(bubble);
    });

    const canvas = document.getElementById('canvas') || document.getElementById('chat-container');
    if (canvas) {
        canvas.appendChild(bubble);
    }

    setTimeout(() => {
        if (bubble.parentNode) {
            bubble.classList.add('fade-out');
            setTimeout(() => bubble.remove(), 1000);
        }
    }, 60000);

    return bubble;
}

function focusOnBubble(focusedBubble) {
    const allBubbles = document.querySelectorAll('.message-bubble');
    allBubbles.forEach(b => {
        if (b !== focusedBubble) {
            b.classList.add('blurred');
        } else {
            b.classList.add('focused');
            b.style.zIndex = '1000';
        }
    });

    const resetHandler = (e) => {
        if (!focusedBubble.contains(e.target)) {
            allBubbles.forEach(b => {
                b.classList.remove('blurred', 'focused');
                b.style.zIndex = '';
            });
            document.removeEventListener('click', resetHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', resetHandler), 100);
}

function getMoodEmoji(mood) {
    const moods = { happy: '😊', sad: '😢', angry: '😠', zen: '🧘', neutral: '😐' };
    return moods[mood] || '😐';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    if (elements.notifications) {
        elements.notifications.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

function loadSettings() {
    const saved = localStorage.getItem('metaPortalSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        state.theme = settings.theme || 'dark';
        state.driftSpeed = settings.driftSpeed || 1;
        
        document.body.classList.toggle('light-theme', state.theme === 'light');
        
        const speedSlider = document.getElementById('drift-speed');
        if (speedSlider) speedSlider.value = state.driftSpeed;
    }
}

function saveSettings() {
    localStorage.setItem('metaPortalSettings', JSON.stringify({
        theme: state.theme,
        driftSpeed: state.driftSpeed
    }));
}

// Socket.IO обработчики
socket.on('init', (data) => {
    state.config = data.config;
    state.messages = data.messages || [];
    
    state.messages.forEach(msg => createMessageBubble(msg));
    
    data.users.forEach(user => {
        state.users.set(user.id, user);
    });
    updateUserCount();
});

socket.on('newMessage', (message) => {
    state.messages.push(message);
    createMessageBubble(message);
    
    if (message.userId !== socket.id) {
        playNotificationSound();
    }
});

socket.on('userJoined', (user) => {
    state.users.set(user.id, user);
    updateUserCount();
    showNotification(`👋 ${user.name} присоединился`, 'success');
});

socket.on('userLeft', (userId) => {
    const user = state.users.get(userId);
    state.users.delete(userId);
    updateUserCount();
    if (user) {
        showNotification(`👋 ${user.name} вышел`, 'info');
    }
});

socket.on('userList', (users) => {
    state.users.clear();
    users.forEach(user => state.users.set(user.id, user));
    updateUserCount();
});

socket.on('userMoodChanged', (data) => {
    const user = state.users.get(data.userId);
    if (user) {
        user.mood = data.mood;
    }
});

socket.on('scoreUpdate', (score) => {
    state.score = score;
    if (elements.scoreDisplay) {
        elements.scoreDisplay.textContent = `⚡ ${score}`;
    }
});

socket.on('achievementUnlocked', (achievement) => {
    showNotification(`🏆 Достижение: ${achievement.name}`, 'success');
    const achievementPopup = document.createElement('div');
    achievementPopup.className = 'achievement-popup';
    achievementPopup.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-name">${achievement.name}</div>
    `;
    document.body.appendChild(achievementPopup);
    setTimeout(() => achievementPopup.remove(), 3000);
});

function updateUserCount() {
    if (elements.userCount) {
        elements.userCount.textContent = `👥 ${state.users.size}`;
    }
}

function playNotificationSound() {
    // Можно добавить аудиофайл
}

document.addEventListener('DOMContentLoaded', init);
