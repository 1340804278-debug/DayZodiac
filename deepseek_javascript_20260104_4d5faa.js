// 365 小馬日記 - 主程序
class PonyDiary {
    constructor() {
        this.currentDay = 1;
        this.selectedMood = '';
        this.currentYear = new Date().getFullYear();
        this.init();
    }

    // 初始化应用
    async init() {
        this.showLoading();
        
        // 注册 Service Worker
        await this.registerServiceWorker();
        
        // 初始化界面
        this.initGrid();
        this.updateStats();
        this.setupEventListeners();
        
        // 检查安装提示
        setTimeout(() => this.checkInstallPrompt(), 3000);
        
        // 隐藏加载动画
        setTimeout(() => this.hideLoading(), 500);
        
        console.log('🦄 小馬日記已啟動！');
    }

    // 显示加载动画
    showLoading() {
        document.getElementById('loading').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // 1. 注册 Service Worker
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('✅ Service Worker 註冊成功:', registration.scope);
                
                // 监听更新
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showToast('🔄 有新版本可用，請刷新頁面');
                        }
                    });
                });
            } catch (error) {
                console.error('❌ Service Worker 註冊失敗:', error);
            }
        }
    }

    // 2. 生成365天网格
    initGrid() {
        const grid = document.getElementById('grid');
        grid.innerHTML = '';
        
        const ponies = ['🦄', '🐴', '🎠', '🐎', '🦓', '🧚', '🌟', '✨', '🌈', '💫'];
        const today = this.getDayOfYear();
        
        for (let day = 1; day <= 365; day++) {
            const card = document.createElement('div');
            card.className = 'pony-card';
            card.dataset.day = day;
            
            // 添加今日标记
            if (day === today) {
                card.classList.add('today');
            }
            
            // 检查是否有日记
            const note = this.getNote(day);
            if (note) {
                card.classList.add('has-entry');
                if (note.mood) {
                    const moodEmoji = this.getMoodEmoji(note.mood);
                    card.innerHTML += `<span class="mood-indicator">${moodEmoji}</span>`;
                }
            }
            
            // 计算月份和日期
            const date = this.getDateFromDay(day);
            const month = date.getMonth() + 1;
            const dateNum = date.getDate();
            
            card.innerHTML += `
                <span class="pony-icon">${ponies[day % ponies.length]}</span>
                <span class="day-label">${month}/${dateNum}</span>
            `;
            
            // 点击事件
            card.addEventListener('click', () => this.openEditor(day));
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.previewNote(day);
            });
            
            grid.appendChild(card);
        }
    }

    // 3. 日记编辑器功能
    openEditor(day) {
        this.currentDay = day;
        this.selectedMood = '';
        
        // 更新标题
        const date = this.getDateFromDay(day);
        const formattedDate = `${date.getMonth() + 1}月${date.getDate()}日`;
        document.getElementById('dateTitle').textContent = `第 ${day} 天 (${formattedDate})`;
        
        // 加载现有内容
        const note = this.getNote(day);
        const editor = document.getElementById('noteInput');
        editor.value = note ? note.text : '';
        document.getElementById('charCount').textContent = (note ? note.text.length : 0);
        
        // 重置心情选择
        document.querySelectorAll('.mood-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        if (note && note.mood) {
            this.selectMood(note.mood);
        }
        
        // 显示编辑器
        document.getElementById('editor').style.display = 'flex';
        editor.focus();
    }

    selectMood(mood) {
        this.selectedMood = mood;
        
        // 更新UI
        document.querySelectorAll('.mood-option').forEach(el => {
            el.classList.remove('selected');
            if (el.dataset.mood === mood) {
                el.classList.add('selected');
            }
        });
    }

    closeEditor() {
        document.getElementById('editor').style.display = 'none';
    }

    saveNote() {
        const text = document.getElementById('noteInput').value.trim();
        if (!text && !this.selectedMood) {
            this.showToast('請填寫日記內容或選擇心情');
            return;
        }
        
        const note = {
            text: text,
            mood: this.selectedMood,
            timestamp: new Date().toISOString(),
            day: this.currentDay
        };
        
        this.saveNoteToStorage(this.currentDay, note);
        
        // 更新卡片样式
        const card = document.querySelector(`.pony-card[data-day="${this.currentDay}"]`);
        if (card) {
            card.classList.add('has-entry');
            if (this.selectedMood) {
                const moodEmoji = this.getMoodEmoji(this.selectedMood);
                card.innerHTML = card.innerHTML.replace(
                    /<span class="mood-indicator">.*?<\/span>/,
                    `<span class="mood-indicator">${moodEmoji}</span>`
                );
                if (!card.innerHTML.includes('mood-indicator')) {
                    card.innerHTML += `<span class="mood-indicator">${moodEmoji}</span>`;
                }
            }
        }
        
        // 更新统计
        this.updateStats();
        
        // 显示成功消息
        this.showToast('📖 日記保存成功！');
        
        this.closeEditor();
    }

    saveAndNext() {
        this.saveNote();
        if (this.currentDay < 365) {
            setTimeout(() => {
                this.openEditor(this.currentDay + 1);
            }, 300);
        }
    }

    // 4. 数据存储相关
    saveNoteToStorage(day, note) {
        const key = `pony_diary_${this.currentYear}_${day}`;
        localStorage.setItem(key, JSON.stringify(note));
    }

    getNote(day) {
        const key = `pony_diary_${this.currentYear}_${day}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    getAllNotes() {
        const notes = {};
        for (let i = 1; i <= 365; i++) {
            const note = this.getNote(i);
            if (note) {
                notes[i] = note;
            }
        }
        return notes;
    }

    // 5. 统计功能
    updateStats() {
        let completed = 0;
        let streak = 0;
        let totalWords = 0;
        
        const today = this.getDayOfYear();
        
        // 计算统计
        for (let i = 1; i <= 365; i++) {
            const note = this.getNote(i);
            if (note) {
                completed++;
                if (note.text) {
                    totalWords += note.text.length;
                }
            }
        }
        
        // 计算连续记录
        for (let i = today; i > 0; i--) {
            if (this.getNote(i)) {
                streak++;
            } else {
                break;
            }
        }
        
        // 更新显示
        document.getElementById('completedDays').textContent = completed;
        document.getElementById('currentStreak').textContent = streak;
        document.getElementById('totalWords').textContent = totalWords;
    }

    // 6. 辅助功能
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--primary-color);
            color: white;
            padding: 14px 28px;
            border-radius: 25px;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
            z-index: 9999;
            animation: slideDown 0.3s ease;
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                to { transform: translateX(-50%) translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 7. 预览功能
    previewNote(day) {
        const note = this.getNote(day);
        if (!note) {
            this.showToast('這一天還沒有日記哦');
            return;
        }
        
        const date = this.getDateFromDay(day);
        document.getElementById('previewTitle').textContent = 
            `第 ${day} 天 (${date.getMonth() + 1}月${date.getDate()}日)`;
        
        let content = '';
        if (note.mood) {
            const moodText = {
                'happy': '😊 心情：開心',
                'calm': '😌 心情：平靜',
                'sad': '😔 心情：難過',
                'excited': '🤩 心情：興奮',
                'love': '🥰 心情：充滿愛'
            }[note.mood] || '📝 日記';
            
            content += `<div class="mood-display">${moodText}</div><br>`;
        }
        
        content += note.text || '（無文字內容）';
        content += `<br><br><small style="color: var(--text-secondary);">記錄於：${new Date(note.timestamp).toLocaleString()}</small>`;
        
        document.getElementById('previewContent').innerHTML = content;
        document.getElementById('preview').style.display = 'flex';
        this.currentPreviewDay = day;
    }

    closePreview() {
        document.getElementById('preview').style.display = 'none';
        this.currentPreviewDay = null;
    }

    editCurrentNote() {
        if (this.currentPreviewDay) {
            this.closePreview();
            setTimeout(() => this.openEditor(this.currentPreviewDay), 300);
        }
    }

    deleteCurrentNote() {
        if (this.currentPreviewDay && confirm('確定要刪除這篇日記嗎？')) {
            const key = `pony_diary_${this.currentYear}_${this.currentPreviewDay}`;
            localStorage.removeItem(key);
            
            // 更新卡片
            const card = document.querySelector(`.pony-card[data-day="${this.currentPreviewDay}"]`);
            if (card) {
                card.classList.remove('has-entry');
                card.querySelector('.mood-indicator')?.remove();
            }
            
            this.updateStats();
            this.showToast('🗑️ 日記已刪除');
            this.closePreview();
        }
    }

    // 8. 导出导入功能
    exportDiary() {
        const notes = this.getAllNotes();
        if (Object.keys(notes).length === 0) {
            this.showToast('沒有日記可導出');
            return;
        }
        
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            totalNotes: Object.keys(notes).length,
            year: this.currentYear,
            notes: notes
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `小馬日記_${this.currentYear}_備份_${new Date().toLocaleDateString()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        this.showToast('📤 導出完成！');
    }

    importDiary() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (data.version !== '1.0') {
                        this.showToast('❌ 檔案版本不兼容');
                        return;
                    }
                    
                    // 确认是否覆盖
                    if (!confirm(`將導入 ${data.totalNotes} 篇日記，是否繼續？`)) {
                        return;
                    }
                    
                    // 导入数据
                    Object.entries(data.notes).forEach(([day, note]) => {
                        const key = `pony_diary_${data.year}_${day}`;
                        localStorage.setItem(key, JSON.stringify(note));
                    });
                    
                    // 刷新界面
                    this.initGrid();
                    this.updateStats();
                    this.showToast('📥 導入成功！');
                    
                } catch (error) {
                    this.showToast('❌ 檔案格式錯誤');
                    console.error('導入失敗:', error);
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    clearAllData() {
        if (confirm('⚠️ 確定要清空所有日記嗎？此操作無法恢復！')) {
            for (let i = 1; i <= 365; i++) {
                const key = `pony_diary_${this.currentYear}_${i}`;
                localStorage.removeItem(key);
            }
            
            this.initGrid();
            this.updateStats();
            this.showToast('🗑️ 所有日記已清空');
        }
    }

    // 9. 工具函数
    getDayOfYear() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const diff = now - start;
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
    }

    getDateFromDay(day) {
        const date = new Date(this.currentYear, 0);
        date.setDate(day);
        return date;
    }

    getMoodEmoji(mood) {
        const emojis = {
            'happy': '😊',
            'calm': '😌',
            'sad': '😔',
            'excited': '🤩',
            'love': '🥰'
        };
        return emojis[mood] || '📝';
    }

    // 10. 快捷功能
    jumpToToday() {
        const today = this.getDayOfYear();
        this.openEditor(today);
        
        // 滚动到对应位置
        const card = document.querySelector(`.pony-card[data-day="${today}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showRandomMemory() {
        const notes = Object.keys(this.getAllNotes());
        if (notes.length === 0) {
            this.showToast('還沒有日記呢，快去寫一篇吧！');
            return;
        }
        
        const randomDay = notes[Math.floor(Math.random() * notes.length)];
        this.previewNote(parseInt(randomDay));
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('pony_diary_theme', isDark ? 'dark' : 'light');
        this.showToast(isDark ? '🌙 切換到夜間模式' : '☀️ 切換到日間模式');
    }

    openToday() {
        const today = this.getDayOfYear();
        this.openEditor(today);
    }

    // 11. 编辑器工具
    addEmoji(emoji) {
        const editor = document.getElementById('noteInput');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const text = editor.value;
        editor.value = text.substring(0, start) + emoji + text.substring(end);
        editor.focus();
        editor.selectionStart = editor.selectionEnd = start + emoji.length;
        
        // 更新字数
        document.getElementById('charCount').textContent = editor.value.length;
    }

    formatText(type) {
        const editor = document.getElementById('noteInput');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
        
        let formattedText = '';
        switch (type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                break;
            default:
                return;
        }
        
        editor.value = editor.value.substring(0, start) + formattedText + editor.value.substring(end);
        editor.focus();
        editor.selectionStart = start + formattedText.length;
        editor.selectionEnd = start + formattedText.length;
    }

    insertDate() {
        const now = new Date();
        const dateStr = `\n📅 ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}\n`;
        this.addEmoji(dateStr);
    }

    // 12. PWA安装功能
    checkInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // 显示安装提示
            setTimeout(() => {
                if (!window.matchMedia('(display-mode: standalone)').matches) {
                    document.getElementById('installPrompt').style.display = 'block';
                }
            }, 3000);
        });
        
        window.installApp = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        this.showToast('🎉 安裝成功！');
                    }
                    deferredPrompt = null;
                });
            }
        };
        
        window.dismissInstall = () => {
            document.getElementById('installPrompt').style.display = 'none';
        };
    }

    // 13. 事件监听器
    setupEventListeners() {
        // 实时字数统计
        document.getElementById('noteInput').addEventListener('input', function() {
            document.getElementById('charCount').textContent = this.value.length;
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (document.getElementById('editor').style.display === 'flex') {
                    this.closeEditor();
                }
                if (document.getElementById('preview').style.display === 'flex') {
                    this.closePreview();
                }
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveNote();
            }
        });
        
        // 全局函数
        window.openEditor = (day) => this.openEditor(day);
        window.closeEditor = () => this.closeEditor();
        window.saveNote = () => this.saveNote();
        window.saveAndNext = () => this.saveAndNext();
        window.selectMood = (mood) => this.selectMood(mood);
        window.closePreview = () => this.closePreview();
        window.editCurrentNote = () => this.editCurrentNote();
        window.deleteCurrentNote = () => this.deleteCurrentNote();
        window.exportDiary = () => this.exportDiary();
        window.importDiary = () => this.importDiary();
        window.clearAllData = () => this.clearAllData();
        window.jumpToToday = () => this.jumpToToday();
        window.showRandomMemory = () => this.showRandomMemory();
        window.toggleTheme = () => this.toggleTheme();
        window.openToday = () => this.openToday();
        window.addEmoji = (emoji) => this.addEmoji(emoji);
        window.formatText = (type) => this.formatText(type);
        window.insertDate = () => this.insertDate();
        
        // 加载主题设置
        const savedTheme = localStorage.getItem('pony_diary_theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    window.ponyDiary = new PonyDiary();
});