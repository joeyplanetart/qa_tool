const ChatModule = {
    conversationId: null,
    messages: [],
    isStreaming: false,
    streamPort: null,

    init() {
        this.conversationId = `conv_${Date.now()}`;
        this.bindEvents();
        this.loadConversation();
    },

    bindEvents() {
        document.getElementById('btn-send')?.addEventListener('click', () => this.sendMessage());
        document.getElementById('btn-new-chat')?.addEventListener('click', () => this.newConversation());

        document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        document.getElementById('chat-search')?.addEventListener('input', (e) => {
            this.filterMessages(e.target.value);
        });

        document.querySelectorAll('.quick-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'kb-mode') {
                    document.getElementById('kb-mode-toggle').checked = true;
                    document.getElementById('chat-input')?.focus();
                } else if (action === 'translate') {
                    App.switchTab('translate');
                } else if (action === 'settings') {
                    App.switchTab('settings');
                }
            });
        });
    },

    async loadConversation() {
        const conv = await AIStorage.getConversation(this.conversationId);
        if (conv?.messages?.length) {
            this.messages = conv.messages;
            this.renderAllMessages();
        }
    },

    async saveConversation() {
        const title = this.messages.find((m) => m.role === 'user')?.content?.slice(0, 40) || '新对话';
        await AIStorage.saveConversation({
            id: this.conversationId,
            title,
            messages: this.messages,
            updatedAt: Date.now()
        });
    },

    newConversation() {
        if (this.isStreaming) return;
        this.conversationId = `conv_${Date.now()}`;
        this.messages = [];
        document.getElementById('chat-messages').innerHTML = '';
        document.getElementById('chat-welcome')?.classList.remove('hidden');
        document.getElementById('chat-search').value = '';
    },

    updateWelcomeVisibility() {
        const welcome = document.getElementById('chat-welcome');
        if (welcome) {
            welcome.classList.toggle('hidden', this.messages.length > 0);
        }
    },

    renderMessage(msg, index) {
        const container = document.getElementById('chat-messages');
        const el = document.createElement('div');
        el.className = `message ${msg.role}`;
        el.dataset.index = index;

        let extra = '';
        if (msg.usage) {
            extra += `<div class="message-usage">${TokenUtils.formatUsage(msg.usage)}</div>`;
        }
        if (msg.sources?.length) {
            const srcText = msg.sources.map((s) => `📄 ${s.docName}`).join(' · ');
            extra += `<div class="message-sources">引用: ${srcText}</div>`;
        }

        el.innerHTML = `
            <div class="message-role">${msg.role === 'user' ? '你' : 'AI'}</div>
            <div class="message-bubble">${this.escapeHtml(msg.content)}</div>
            ${extra}
        `;
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
        return el;
    },

    renderAllMessages() {
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';
        this.messages.forEach((msg, i) => this.renderMessage(msg, i));
        this.updateWelcomeVisibility();
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    filterMessages(query) {
        const q = query.trim().toLowerCase();
        document.querySelectorAll('.message').forEach((el) => {
            const idx = parseInt(el.dataset.index, 10);
            const msg = this.messages[idx];
            if (!q) {
                el.classList.remove('hidden-by-search');
                el.querySelector('.message-bubble').innerHTML = this.escapeHtml(msg.content);
                return;
            }
            const match = msg.content.toLowerCase().includes(q);
            el.classList.toggle('hidden-by-search', !match);
            if (match) {
                const highlighted = msg.content.replace(
                    new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                    '<mark>$1</mark>'
                );
                el.querySelector('.message-bubble').innerHTML = highlighted;
            }
        });
    },

    async sendMessage() {
        if (this.isStreaming) return;

        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();
        if (!text) return;

        const { providerId, model } = SettingsModule.getSelectedModel();
        const apiKey = await SettingsModule.getApiKey(providerId);
        if (!apiKey) {
            alert('请先在设置中配置 API Key');
            App.switchTab('settings');
            return;
        }

        const kbMode = document.getElementById('kb-mode-toggle')?.checked;

        const userMsg = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.renderMessage(userMsg, this.messages.length - 1);
        this.updateWelcomeVisibility();
        input.value = '';
        input.disabled = true;
        document.getElementById('btn-send').disabled = true;
        this.isStreaming = true;

        const assistantMsg = { role: 'assistant', content: '', timestamp: Date.now() };
        this.messages.push(assistantMsg);
        const msgIndex = this.messages.length - 1;
        const msgEl = this.renderMessage(assistantMsg, msgIndex);
        const bubbleEl = msgEl.querySelector('.message-bubble');

        try {
            const port = chrome.runtime.connect({ name: 'llm-stream' });
            this.streamPort = port;

            port.onMessage.addListener((msg) => {
                if (msg.type === 'chunk') {
                    assistantMsg.content += msg.content;
                    bubbleEl.textContent = assistantMsg.content;
                    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
                }
                if (msg.type === 'done') {
                    if (msg.usage) {
                        assistantMsg.usage = msg.usage;
                        const usageEl = document.createElement('div');
                        usageEl.className = 'message-usage';
                        usageEl.textContent = TokenUtils.formatUsage(msg.usage);
                        msgEl.appendChild(usageEl);
                    }
                    if (msg.sources) {
                        assistantMsg.sources = msg.sources;
                        const srcEl = document.createElement('div');
                        srcEl.className = 'message-sources';
                        srcEl.textContent = '引用: ' + msg.sources.map((s) => `📄 ${s.docName}`).join(' · ');
                        msgEl.appendChild(srcEl);
                    }
                    this.finishStream(input);
                }
                if (msg.type === 'error') {
                    assistantMsg.content = `错误: ${msg.error}`;
                    bubbleEl.textContent = assistantMsg.content;
                    this.finishStream(input);
                }
            });

            port.onDisconnect.addListener(() => {
                if (this.isStreaming) this.finishStream(input);
            });

            const history = this.messages
                .slice(0, -1)
                .filter((m) => m.content)
                .map((m) => ({ role: m.role, content: m.content }));

            port.postMessage({
                type: 'LLM_CHAT_STREAM',
                providerId,
                model,
                messages: history,
                kbMode,
                userQuestion: text
            });
        } catch (err) {
            assistantMsg.content = `错误: ${err.message}`;
            bubbleEl.textContent = assistantMsg.content;
            this.finishStream(input);
        }
    },

    finishStream(input) {
        this.isStreaming = false;
        this.streamPort = null;
        input.disabled = false;
        document.getElementById('btn-send').disabled = false;
        input.focus();
        this.saveConversation();
    }
};
