// Meta Portal - Complete Client Logic

class MetaPortal {
    constructor() {
        this.socket = null;
        this.username = localStorage.getItem('metaUsername') || '';
        this.avatar = localStorage.getItem('metaAvatar') || '👤';
        this.theme = localStorage.getItem('metaTheme') || 'dark';
        this.friends = JSON.parse(localStorage.getItem('metaFriends') || '[]');
        this.achievements = JSON.parse(localStorage.getItem('metaAchievements') || '[]');
        this.messageCount = parseInt(localStorage.getItem('metaMessageCount') || '0');
        this.currentTab = 'chat';
        
        // Achievement definitions
        this.achievementDefinitions = [
            { id: 'first_message', title: 'Первое сообщение', description: 'Отправьте первое сообщение', icon: '💬', requirement: 1, type: 'messages' },
            { id: 'chatter_10', title: 'Болтун', description: 'Отправьте 10 сообщений', icon: '🗣️', requirement: 10, type: 'messages' },
            { id: 'chatter_50', title: 'Говорун', description: 'Отправьте 50 сообщений', icon: '📢', requirement: 50, type: 'messages' },
            { id: 'chatter_100', title: 'Душа компании', description: 'Отправьте 100 сообщений', icon: '🎉', requirement: 100, type: 'messages' },
            { id: 'first_friend', title: 'Новый друг', description: 'Добавьте первого друга', icon: '🤝', requirement: 1, type: 'friends' },
            { id: 'friend_5', title: 'Популярный', description: 'Имейте 5 друзей', icon: '⭐', requirement: 5, type: 'friends' },
            { id: 'night_owl', title: 'Сова', description: 'Будьте онлайн после полуночи', icon: '🦉', requirement: 1, type: 'special' },
            { id: 'early_bird', title: 'Жаворонок', description: 'Будьте онлайн до 6 утра', icon: '🐦', requirement: 1, type: 'special' }
        ];

        // Avatar options
        this.avatars = ['👤', '😎', '🤖', '👽', '🦊', '🐱', '🦁', '🐼', '🐨', '🐸', '🦄', '🐲', '🌟', '🔥', '💎', '🎮'];

        this.init();
    }

    init() {
        this.setupDOM();
        this.applyTheme();
        this.loadUserData();
        this.connectSocket();
        this.bindEvents();
        this.renderAchievements();
        this.checkSpecialAchievements();
        this.updateAchievementsPreview();
    }

    setupDOM() {
        // Get DOM elements
        this.elements = {
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.querySelector('.theme-icon'),
            usernameInput: document.getElementById('usernameInput'),
            avatarSelector: document.getElementById('avatarSelector'),
            currentAvatar: document.querySelector('.current-avatar'),
            messagesContainer: document.getElementById('messagesContainer'),
            messageInput: document.getElementById('messageInput'),
            sendBtn: document.getElementById('sendBtn'),
            onlineCount: document.getElementById('onlineCount'),
            navBtns: document.querySelectorAll('.nav-btn'),
            chatTab: document.getElementById('chatTab'),
            friendsTab: document.getElementById('friendsTab'),
            achievementsTab: document.getElementById('achievementsTab'),
            friendsList: document.getElementById('friendsList'),
            friendSearch: document.getElementById('friendSearch'),
            addFriendBtn: document.getElementById('addFriendBtn'),
            achievementsGrid: document.getElementById('achievementsGrid'),
            miniAchievements: document.getElementById('miniAchievements'),
            avatarModal: document.getElementById('avatarModal'),
            avatarGrid: document.getElementById('avatarGrid'),
            closeAvatarModal: document.getElementById('closeAvatarModal'),
            toastContainer: document.getElementById('toastContainer')
        };
    }

    applyTheme() {
        document.body.className = this.theme + '-theme';
        this.elements.themeIcon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        localStorage.setItem('metaTheme', this.theme);
    }

    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
        this.showToast(`Тема: ${this.theme === 'dark' ? 'Тёмная' : 'Светлая'}`, 'success');
    }

    loadUserData() {
        this.elements.usernameInput.value = this.username;
        this.updateAvatarDisplay();
    }

    updateAvatarDisplay() {
        const svg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='40' fill='white'%3E${encodeURIComponent(this.avatar)}%3C/text%3E%3C/svg%3E`;
        this.elements.currentAvatar.src = svg;
        localStorage.setItem('metaAvatar', this.avatar);
    }

    connectSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.showToast('Подключено к серверу', 'success');
            this.sendUserInfo();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showToast('Потеряно соединение', 'error');
        });

        this.socket.on('chat-message', (data) => {
            this.addMessage(data);
            this.checkAchievement('messages');
        });

        this.socket.on('user-joined', (data) => {
            this.showToast(`${data.username} присоединился`, 'success');
        });

        this.socket.on('user-left', (data) => {
            this.showToast(`${data.username} покинул чат`, 'warning');
        });

        this.socket.on('online-count', (count) => {
            this.elements.onlineCount.textContent = count;
        });

        this.socket.on('chat-history', (messages) => {
            this.elements.messagesContainer.innerHTML = '';
            messages.forEach(msg => this.addMessage(msg, true));
        });
    }

    sendUserInfo() {
        this.socket.emit('user-info', {
            username: this.username || 'Аноним',
            avatar: this.avatar
        });
    }

    bindEvents() {
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

        // Username input
        this.elements.usernameInput.addEventListener('change', (e) => {
            this.username = e.target.value.trim() || 'Аноним';
            localStorage.setItem('metaUsername', this.username);
            this.sendUserInfo();
            this.showToast(`Имя изменено на: ${this.username}`, 'success');
        });

        // Avatar selector
        this.elements.avatarSelector.addEventListener('click', () => {
            this.openAvatarModal();
        });

        // Close avatar modal
        this.elements.closeAvatarModal.addEventListener('click', () => {
            this.elements.avatarModal.classList.remove('active');
        });

        // Click outside modal
        this.elements.avatarModal.addEventListener('click', (e) => {
            if (e.target === this.elements.avatarModal) {
                this.elements.avatarModal.classList.remove('active');
            }
        });

        // Send message on button click
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

        // Send message on Enter
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Navigation tabs
        this.elements.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Add friend
        this.elements.addFriendBtn.addEventListener('click', () => this.addFriend());

        // Friend search
        this.elements.friendSearch.addEventListener('input', (e) => {
            this.filterFriends(e.target.value);
        });
    }

    sendMessage() {
        const text = this.elements.messageInput.value.trim();
        if (!text) return;

        const message = {
            id: Date.now(),
            username: this.username || 'Аноним',
            avatar: this.avatar,
            text: text,
            timestamp: new Date().toISOString(),
            own: true
        };

        this.socket.emit('chat-message', message);
        this.elements.messageInput.value = '';
        
        // Increment message count
        this.messageCount++;
        localStorage.setItem('metaMessageCount', this.messageCount.toString());
        this.checkAchievement('messages');
    }

    addMessage(data, isHistory = false) {
        // Remove welcome message if exists
        const welcomeMsg = this.elements.messagesContainer.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        const isOwn = data.own || data.username === this.username;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isOwn ? 'own' : ''} ${!isHistory ? 'new' : ''}`;
        
        const time = new Date(data.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        messageEl.innerHTML = `
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='40' fill='white'%3E${encodeURIComponent(data.avatar || '👤')}%3C/text%3E%3C/svg%3E" alt="Avatar" class="message-avatar">
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${data.username}</span>
                </div>
                <div class="message-bubble">${this.escapeHtml(data.text)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.elements.messagesContainer.appendChild(messageEl);
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;

        // Play notification sound for non-own messages
        if (!isOwn && !isHistory) {
            this.playNotificationSound();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update nav buttons
        this.elements.navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');

        if (tab === 'friends') {
            this.renderFriends();
        } else if (tab === 'achievements') {
            this.renderAchievements();
        }
    }

    openAvatarModal() {
        this.elements.avatarGrid.innerHTML = '';
        
        this.avatars.forEach(av => {
            const avatarEl = document.createElement('img');
            avatarEl.className = `avatar-option ${av === this.avatar ? 'selected' : ''}`;
            avatarEl.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='40' fill='white'%3E${encodeURIComponent(av)}%3C/text%3E%3C/svg%3E`;
            avatarEl.addEventListener('click', () => {
                this.avatar = av;
                this.updateAvatarDisplay();
                this.sendUserInfo();
                this.elements.avatarModal.classList.remove('active');
                this.showToast('Аватар обновлён', 'success');
                
                // Check first avatar achievement
                if (!this.achievements.includes('first_avatar')) {
                    this.unlockAchievement('first_avatar');
                }
            });
            this.elements.avatarGrid.appendChild(avatarEl);
        });

        this.elements.avatarModal.classList.add('active');
    }

    addFriend() {
        const name = this.elements.friendSearch.value.trim();
        if (!name) {
            this.showToast('Введите имя друга', 'warning');
            return;
        }

        if (this.friends.find(f => f.name === name)) {
            this.showToast('Этот друг уже добавлен', 'warning');
            return;
        }

        const friend = {
            id: Date.now(),
            name: name,
            avatar: '👤',
            status: 'offline',
            lastSeen: new Date().toISOString()
        };

        this.friends.push(friend);
        this.saveFriends();
        this.renderFriends();
        this.elements.friendSearch.value = '';
        
        this.showToast(`Друг "${name}" добавлен`, 'success');
        
        // Check friend achievements
        this.checkAchievement('friends');
    }

    removeFriend(id) {
        const friend = this.friends.find(f => f.id === id);
        this.friends = this.friends.filter(f => f.id !== id);
        this.saveFriends();
        this.renderFriends();
        this.showToast(`Друг "${friend.name}" удалён`, 'warning');
    }

    saveFriends() {
        localStorage.setItem('metaFriends', JSON.stringify(this.friends));
    }

    renderFriends() {
        if (this.friends.length === 0) {
            this.elements.friendsList.innerHTML = `
                <div class="empty-state">
                    <p>У вас пока нет друзей</p>
                    <p class="hint">Используйте поиск чтобы найти людей</p>
                </div>
            `;
            return;
        }

        this.elements.friendsList.innerHTML = '';
        this.friends.forEach(friend => {
            const friendEl = document.createElement('div');
            friendEl.className = 'friend-item';
            friendEl.innerHTML = `
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23667eea'/%3E%3Ctext x='50' y='55' text-anchor='middle' font-size='40' fill='white'%3E${encodeURIComponent(friend.avatar)}%3C/text%3E%3C/svg%3E" alt="Avatar" class="friend-avatar">
                <div class="friend-info">
                    <div class="friend-name">${friend.name}</div>
                    <div class="friend-status">
                        <span class="status-indicator ${friend.status}"></span>
                        <span>${friend.status === 'online' ? 'Онлайн' : 'Офлайн'}</span>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="action-btn chat" onclick="portal.chatWithFriend(${friend.id})">💬</button>
                    <button class="action-btn remove" onclick="portal.removeFriend(${friend.id})">✕</button>
                </div>
            `;
            this.elements.friendsList.appendChild(friendEl);
        });
    }

    filterFriends(query) {
        const items = this.elements.friendsList.querySelectorAll('.friend-item');
        items.forEach(item => {
            const name = item.querySelector('.friend-name').textContent.toLowerCase();
            item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
        });
    }

    chatWithFriend(id) {
        const friend = this.friends.find(f => f.id === id);
        if (friend) {
            this.elements.messageInput.value = `@${friend.name} `;
            this.elements.messageInput.focus();
            this.switchTab('chat');
        }
    }

    checkAchievement(type) {
        let shouldUnlock = null;

        if (type === 'messages') {
            this.achievementDefinitions.forEach(ach => {
                if (ach.type === 'messages' && 
                    this.messageCount >= ach.requirement && 
                    !this.achievements.includes(ach.id)) {
                    shouldUnlock = ach.id;
                }
            });
        } else if (type === 'friends') {
            this.achievementDefinitions.forEach(ach => {
                if (ach.type === 'friends' && 
                    this.friends.length >= ach.requirement && 
                    !this.achievements.includes(ach.id)) {
                    shouldUnlock = ach.id;
                }
            });
        }

        if (shouldUnlock) {
            this.unlockAchievement(shouldUnlock);
        }
    }

    checkSpecialAchievements() {
        const hour = new Date().getHours();
        
        // Night owl (after midnight - before 6am)
        if ((hour >= 0 && hour < 6) && !this.achievements.includes('night_owl')) {
            setTimeout(() => this.unlockAchievement('night_owl'), 5000);
        }
        
        // Early bird (before 6am)
        if (hour < 6 && !this.achievements.includes('early_bird')) {
            setTimeout(() => this.unlockAchievement('early_bird'), 5000);
        }
    }

    unlockAchievement(id) {
        if (this.achievements.includes(id)) return;

        const achievement = this.achievementDefinitions.find(a => a.id === id);
        if (!achievement) return;

        this.achievements.push(id);
        localStorage.setItem('metaAchievements', JSON.stringify(this.achievements));
        
        this.showToast(`🏆 Достижение: ${achievement.title}`, 'success');
        this.updateAchievementsPreview();
        
        // Show special animation
        this.showAchievementNotification(achievement);
    }

    showAchievementNotification(achievement) {
        const notification = document.createElement('div');
        notification.className = 'toast success';
        notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 3000; animation: slideInRight 0.5s ease;';
        notification.innerHTML = `
            <span class="toast-icon">🏆</span>
            <div>
                <strong>${achievement.title}</strong>
                <p style="font-size: 0.85rem; margin-top: 5px;">${achievement.description}</p>
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.5s reverse';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    updateAchievementsPreview() {
        const unlocked = this.achievementDefinitions.filter(a => this.achievements.includes(a.id));
        const recent = unlocked.slice(-3).reverse();
        
        this.elements.miniAchievements.innerHTML = '';
        recent.forEach(ach => {
            const el = document.createElement('div');
            el.className = 'mini-achievement';
            el.innerHTML = `<span class="icon">${ach.icon}</span><span>${ach.title}</span>`;
            this.elements.miniAchievements.appendChild(el);
        });
    }

    renderAchievements() {
        this.elements.achievementsGrid.innerHTML = '';
        
        this.achievementDefinitions.forEach(ach => {
            const unlocked = this.achievements.includes(ach.id);
            let progress = 0;
            
            if (ach.type === 'messages') {
                progress = Math.min(100, (this.messageCount / ach.requirement) * 100);
            } else if (ach.type === 'friends') {
                progress = Math.min(100, (this.friends.length / ach.requirement) * 100);
            } else {
                progress = unlocked ? 100 : 0;
            }

            const card = document.createElement('div');
            card.className = `achievement-card ${unlocked ? 'unlocked' : 'locked'}`;
            card.innerHTML = `
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-title">${ach.title}</div>
                <div class="achievement-description">${ach.description}</div>
                <div class="achievement-progress">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                </div>
                <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-secondary);">
                    ${unlocked ? '✅ Разблокировано' : `${Math.round(progress)}%`}
                </div>
            `;
            this.elements.achievementsGrid.appendChild(card);
        });
    }

    showToast(message, type = 'info') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
        `;
        
        this.elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    playNotificationSound() {
        // Simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Audio not supported or blocked
        }
    }
}

// Initialize the app
let portal;
document.addEventListener('DOMContentLoaded', () => {
    portal = new MetaPortal();
});