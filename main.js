// META PORTAL: SPATIAL FLOW LOGIC

class SpatialChat {
    constructor() {
        this.socket = io();
        this.username = localStorage.getItem('mp_username') || 'Гость';
        this.messages = [];
        this.bubbleElements = new Map(); // Храним ссылки на DOM элементы
        this.driftSpeed = parseFloat(localStorage.getItem('mp_drift_speed')) || 2;
        this.container = document.getElementById('spatial-container');
        this.isDarkTheme = true;
        
        this.init();
    }

    init() {
        this.setupUI();
        this.connectSocket();
        this.startDriftEngine();
        this.loadHistory();
    }

    setupUI() {
        // Элементы
        this.input = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.usernameDisplay = document.getElementById('username-display');
        this.themeToggle = document.getElementById('theme-toggle');
        this.settingsBtn = document.getElementById('settings-btn');
        this.modal = document.getElementById('settings-modal');
        this.closeModalBtn = document.querySelector('.close-modal');
        this.configUsernameInput = document.getElementById('config-username');
        this.driftSpeedInput = document.getElementById('drift-speed');

        // Установка имени
        this.usernameDisplay.textContent = this.username;
        this.configUsernameInput.value = this.username;
        this.driftSpeedInput.value = this.driftSpeed;

        // События
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        this.settingsBtn.addEventListener('click', () => {
            this.modal.classList.remove('hidden');
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.modal.classList.add('hidden');
        });

        // Сохранение настроек
        this.configUsernameInput.addEventListener('change', (e) => {
            this.username = e.target.value.trim() || 'Гость';
            localStorage.setItem('mp_username', this.username);
            this.usernameDisplay.textContent = this.username;
            this.socket.emit('username_change', this.username);
        });

        this.driftSpeedInput.addEventListener('input', (e) => {
            this.driftSpeed = parseFloat(e.target.value);
            localStorage.setItem('mp_drift_speed', this.driftSpeed);
        });

        // Закрытие модального окна по клику вне
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.modal.classList.add('hidden');
            }
        });
    }

    connectSocket() {
        this.socket.on('connect', () => {
            console.log('Connected to Meta Portal Flow');
            this.socket.emit('join', { username: this.username });
        });

        this.socket.on('chat_history', (history) => {
            this.messages = history;
            this.renderHistory();
        });

        this.socket.on('new_message', (data) => {
            this.addMessage(data);
        });

        this.socket.on('user_joined', (data) => {
            console.log(`User joined: ${data.username}`);
            // Можно добавить системное уведомление в поток
        });

        this.socket.on('user_left', (data) => {
            console.log(`User left: ${data.username}`);
        });
    }

    sendMessage() {
        const text = this.input.value.trim();
        if (!text) return;

        const messageData = {
            username: this.username,
            text: text,
            timestamp: Date.now()
        };

        this.socket.emit('chat_message', messageData);
        this.input.value = '';
        this.input.focus();
    }

    addMessage(data) {
        // Проверяем, не существует ли уже такое сообщение
        if (this.bubbleElements.has(data.id)) return;

        this.messages.push(data);
        this.createBubble(data);
    }

    createBubble(data) {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${data.username === this.username ? 'self' : ''}`;
        bubble.id = `msg-${data.id}`;
        
        // Позиционирование
        const positions = this.calculatePosition();
        bubble.style.left = `${positions.x}px`;
        bubble.style.top = `${positions.y}px`;
        
        // Случайный небольшой поворот для естественности
        const rotation = (Math.random() - 0.5) * 10;
        bubble.style.transform = `rotate(${rotation}deg)`;

        // Данные для дрейфа
        bubble.dataset.vx = (Math.random() - 0.5) * 0.5; // Скорость X
        bubble.dataset.vy = (Math.random() - 0.5) * 0.5; // Скорость Y
        bubble.dataset.rotSpeed = (Math.random() - 0.5) * 0.2; // Скорость вращения

        const timeString = new Date(data.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        bubble.innerHTML = `
            <span class="message-author">${this.escapeHtml(data.username)}</span>
            <span class="message-text">${this.escapeHtml(data.text)}</span>
            <span class="message-time">${timeString}</span>
        `;

        // Интерактивность: клик приближает
        bubble.addEventListener('click', () => {
            this.focusBubble(bubble);
        });

        this.container.appendChild(bubble);
        this.bubbleElements.set(data.id, bubble);

        // Удаляем подсказку если есть
        const hint = document.querySelector('.hint-text');
        if (hint) hint.style.display = 'none';

        // Ограничение количества сообщений на экране
        if (this.bubbleElements.size > 50) {
            const oldestId = this.messages[0].id;
            const oldestBubble = document.getElementById(`msg-${oldestId}`);
            if (oldestBubble) {
                oldestBubble.style.opacity = '0';
                setTimeout(() => oldestBubble.remove(), 500);
                this.bubbleElements.delete(oldestId);
                this.messages.shift();
            }
        }
    }

    calculatePosition() {
        // Генерируем случайную позицию в пределах экрана с отступами
        const padding = 80;
        const maxX = window.innerWidth - 320 - padding; // 320 ширина пузыря
        const maxY = window.innerHeight - 150 - padding; // 150 высота панели ввода

        let x, y, overlap;
        let attempts = 0;
        
        // Пытаемся найти место без перекрытий (максимум 50 попыток)
        do {
            x = Math.random() * (maxX - padding) + padding;
            y = Math.random() * (maxY - padding) + padding;
            overlap = false;

            for (const [id, bubble] of this.bubbleElements) {
                const rect = bubble.getBoundingClientRect();
                const dist = Math.hypot(
                    (x + 150) - (rect.left + rect.width/2),
                    (y + 40) - (rect.top + rect.height/2)
                );
                if (dist < 200) { // Минимальное расстояние между центрами
                    overlap = true;
                    break;
                }
            }
            attempts++;
        } while (overlap && attempts < 50);

        return { x, y };
    }

    renderHistory() {
        this.container.innerHTML = '<div class="hint-text">Чат живет своей жизнью...</div>';
        this.bubbleElements.clear();
        
        // Рендерим последние 30 сообщений из истории
        const historyToRender = this.messages.slice(-30);
        historyToRender.forEach(msg => this.createBubble(msg));
    }

    startDriftEngine() {
        // Движок дрейфа сообщений
        const animate = () => {
            for (const [id, bubble] of this.bubbleElements) {
                if (!bubble) continue;

                // Получаем текущие координаты
                let currentLeft = parseFloat(bubble.style.left) || 0;
                let currentTop = parseFloat(bubble.style.top) || 0;
                
                // Получаем скорости из dataset
                let vx = parseFloat(bubble.dataset.vx) || 0;
                let vy = parseFloat(bubble.dataset.vy) || 0;
                let rot = parseFloat(bubble.style.transform.replace(/.*rotate\(([^)]*)\).*/, '$1')) || 0;
                let rotSpeed = parseFloat(bubble.dataset.rotSpeed) || 0;

                // Обновляем позиции
                const speedMultiplier = this.driftSpeed * 0.1;
                currentLeft += vx * speedMultiplier;
                currentTop += vy * speedMultiplier;
                rot += rotSpeed * speedMultiplier;

                // Границы экрана (отталкивание)
                const maxX = window.innerWidth - bubble.offsetWidth - 20;
                const maxY = window.innerHeight - bubble.offsetHeight - 100;

                if (currentLeft <= 20 || currentLeft >= maxX) {
                    vx = -vx;
                    currentLeft = Math.max(20, Math.min(currentLeft, maxX));
                }
                if (currentTop <= 20 || currentTop >= maxY) {
                    vy = -vy;
                    currentTop = Math.max(20, Math.min(currentTop, maxY));
                }

                // Сохраняем обратно
                bubble.style.left = `${currentLeft}px`;
                bubble.style.top = `${currentTop}px`;
                bubble.style.transform = `rotate(${rot}deg)`;
                
                bubble.dataset.vx = vx;
                bubble.dataset.vy = vy;
            }

            requestAnimationFrame(animate);
        };

        animate();
    }

    focusBubble(bubble) {
        // Приближаем выбранное сообщение
        for (const [id, b] of this.bubbleElements) {
            if (b !== bubble) {
                b.style.opacity = '0.3';
                b.style.zIndex = '1';
            } else {
                b.style.opacity = '1';
                b.style.zIndex = '1000';
                b.style.transform = 'scale(1.2) rotate(0deg)';
            }
        }

        // Возвращаем как было через 3 секунды
        setTimeout(() => {
            for (const [id, b] of this.bubbleElements) {
                b.style.opacity = '1';
                b.style.zIndex = '';
                b.style.transform = '';
            }
        }, 3000);
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        document.body.className = this.isDarkTheme ? 'theme-dark' : 'theme-light';
        this.themeToggle.textContent = this.isDarkTheme ? '🌓' : '☀️';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadHistory() {
        // Запрос истории будет обработан сервером автоматически при подключении
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new SpatialChat();
});
