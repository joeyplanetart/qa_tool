const ChatModule = {
    conversationId: null,
    messages: [],
    isStreaming: false,

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
                } else if (action === 'qrcode') {
                    App.switchTab('qrcode');
                } else if (action === 'shipaddress') {
                    App.switchTab('shipaddress');
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

    renderReasoningBlock(reasoning) {
        if (!reasoning) return '';
        return `
            <details class="message-reasoning">
                <summary>思考过程</summary>
                <div class="reasoning-content">${this.escapeHtml(reasoning)}</div>
            </details>
        `;
    },

    renderBubbleContent(msg) {
        if (msg.role === 'assistant') {
            return `<div class="message-bubble md-content">${Markdown.render(msg.content)}</div>`;
        }
        return `<div class="message-bubble">${this.escapeHtml(msg.content)}</div>`;
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

        const reasoningHtml = msg.role === 'assistant' ? this.renderReasoningBlock(msg.reasoning) : '';

        el.innerHTML = `
            <div class="message-role">${msg.role === 'user' ? '你' : 'AI'}</div>
            ${reasoningHtml}
            ${this.renderBubbleContent(msg)}
            ${extra}
        `;
        container.appendChild(el);
        container.scrollTop = container.scrollHeight;
        return el;
    },

    createStreamingAssistantElements(msgEl) {
        const reasoningDetails = document.createElement('details');
        reasoningDetails.className = 'message-reasoning';
        reasoningDetails.style.display = 'none';
        reasoningDetails.innerHTML = '<summary>思考过程</summary><div class="reasoning-content"></div>';

        const bubbleEl = msgEl.querySelector('.message-bubble');
        msgEl.insertBefore(reasoningDetails, bubbleEl);

        return {
            reasoningDetails,
            reasoningEl: reasoningDetails.querySelector('.reasoning-content'),
            bubbleEl
        };
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

    scrollToBottom() {
        const container = document.getElementById('chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    },

    filterMessages(query) {
        const q = query.trim().toLowerCase();
        document.querySelectorAll('.message').forEach((el) => {
            const idx = parseInt(el.dataset.index, 10);
            const msg = this.messages[idx];
            if (!q) {
                el.classList.remove('hidden-by-search');
                const bubble = el.querySelector('.message-bubble');
                if (bubble) {
                    if (msg.role === 'assistant') {
                        bubble.innerHTML = Markdown.render(msg.content);
                    } else {
                        bubble.textContent = msg.content;
                    }
                }
                return;
            }
            const searchText = (msg.content + (msg.reasoning || '')).toLowerCase();
            const match = searchText.includes(q);
            el.classList.toggle('hidden-by-search', !match);
            if (match) {
                const bubble = el.querySelector('.message-bubble');
                const highlighted = msg.content.replace(
                    new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                    '<mark>$1</mark>'
                );
                if (bubble) bubble.innerHTML = highlighted;
            }
        });
    },

    async sendMessage() {
        if (this.isStreaming) return;

        const input = document.getElementById('chat-input');
        const text = input?.value?.trim();
        if (!text) return;

        const { providerId, model } = SettingsModule.getSelectedModel();
        if (!providerId || !model) {
            alert('请先选择模型');
            App.switchTab('settings');
            return;
        }

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

        const assistantMsg = { role: 'assistant', content: '', reasoning: '', timestamp: Date.now() };
        this.messages.push(assistantMsg);
        const msgIndex = this.messages.length - 1;
        const msgEl = this.renderMessage(assistantMsg, msgIndex);
        const { reasoningDetails, reasoningEl, bubbleEl } = this.createStreamingAssistantElements(msgEl);

        let sources = null;
        let chatMessages = this.messages
            .slice(0, -1)
            .filter((m) => m.content)
            .map((m) => ({ role: m.role, content: m.content }));

        try {
            if (kbMode) {
                const ragResult = await chrome.runtime.sendMessage({
                    type: 'RAG_BUILD_MESSAGES',
                    userQuestion: text
                });

                if (!ragResult?.success) {
                    assistantMsg.content = ragResult?.error === 'no_chunks'
                        ? '知识库中未找到相关内容。请先在「知识库」Tab 导入文档。'
                        : `知识库检索失败: ${ragResult?.error || '未知错误'}`;
                    bubbleEl.textContent = assistantMsg.content;
                    this.finishStream(input);
                    return;
                }

                chatMessages = ragResult.messages;
                sources = ragResult.sources;
            }

            await LLMProviders.streamChat({
                providerId,
                model,
                messages: chatMessages,
                onReasoningChunk: (chunk) => {
                    assistantMsg.reasoning += chunk;
                    reasoningDetails.style.display = '';
                    reasoningEl.textContent = assistantMsg.reasoning;
                    this.scrollToBottom();
                },
                onChunk: (content) => {
                    assistantMsg.content += content;
                    bubbleEl.textContent = assistantMsg.content;
                    this.scrollToBottom();
                },
                onDone: ({ usage }) => {
                    bubbleEl.innerHTML = Markdown.render(assistantMsg.content);

                    if (usage) {
                        assistantMsg.usage = usage;
                        const usageEl = document.createElement('div');
                        usageEl.className = 'message-usage';
                        usageEl.textContent = TokenUtils.formatUsage(usage);
                        msgEl.appendChild(usageEl);
                    }
                    if (sources?.length) {
                        assistantMsg.sources = sources;
                        const srcEl = document.createElement('div');
                        srcEl.className = 'message-sources';
                        srcEl.textContent = '引用: ' + sources.map((s) => `📄 ${s.docName}`).join(' · ');
                        msgEl.appendChild(srcEl);
                    }
                    if (!assistantMsg.content && !assistantMsg.reasoning) {
                        assistantMsg.content = '模型未返回内容，请检查模型名称或 API 配置';
                        bubbleEl.textContent = assistantMsg.content;
                    }
                    this.finishStream(input);
                },
                onError: (err) => {
                    assistantMsg.content = `错误: ${err.message}`;
                    bubbleEl.textContent = assistantMsg.content;
                    this.finishStream(input);
                }
            });
        } catch (err) {
            assistantMsg.content = `错误: ${err.message}`;
            bubbleEl.textContent = assistantMsg.content;
            this.finishStream(input);
        }
    },

    finishStream(input) {
        this.isStreaming = false;
        input.disabled = false;
        document.getElementById('btn-send').disabled = false;
        input.focus();
        this.saveConversation();
    }
};
