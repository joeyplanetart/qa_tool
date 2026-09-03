const ProductContextModule = {
    snapshot: null,
    _lastStateKey: null,
    _refreshTimer: null,
    _refreshing: false,

    init() {
        document.getElementById('btn-refresh-product-context')?.addEventListener('click', () => {
            this.refresh({ immediate: true });
        });

        document.getElementById('btn-insert-product-context')?.addEventListener('click', () => {
            this.insertIntoChatInput();
        });

        chrome.tabs.onActivated.addListener(() => {
            this.scheduleRefresh();
        });

        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (!changeInfo.status && !changeInfo.url) return;
            this.scheduleRefresh(tabId);
        });

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area !== 'local') return;
            const keys = ['designerName', 'designId', 'cpProductId', 'productsData', 'productImageId', 'url'];
            if (!keys.some((k) => changes[k])) return;
            this.scheduleRefresh(null, changes.url?.newValue);
        });

        this.refresh({ immediate: true });
    },

    scheduleRefresh(tabId, storageUrl) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = setTimeout(() => {
            this.refresh({ tabId, storageUrl });
        }, 350);
    },

    isSupportedTabUrl(url) {
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            return false;
        }
        try {
            return CONFIG.isSupportedHostname(new URL(url).hostname);
        } catch (e) {
            return false;
        }
    },

    isSamePageUrl(a, b) {
        if (!a || !b) return false;
        try {
            const urlA = new URL(a);
            const urlB = new URL(b);
            return urlA.origin === urlB.origin && urlA.pathname === urlB.pathname;
        } catch (e) {
            return a === b;
        }
    },

    getSnapshotKey(snapshot) {
        if (!snapshot?.isProductPage || !snapshot.fields?.length) return 'hidden';
        return `${snapshot.url}::${snapshot.fields.map((f) => `${f.label}=${f.value}`).join('|')}`;
    },

    hideCard() {
        if (this._lastStateKey === 'hidden') return;

        const card = document.getElementById('product-context-card');
        const body = document.getElementById('product-context-body');
        this.snapshot = null;
        this._lastStateKey = 'hidden';
        if (card) card.classList.add('hidden');
        if (body) body.innerHTML = '';
    },

    async refresh(options = {}) {
        if (this._refreshing && !options.immediate) return;

        const card = document.getElementById('product-context-card');
        const body = document.getElementById('product-context-body');
        if (!card || !body) return;

        this._refreshing = true;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tab = tabs[0];

            if (!tab?.url || !this.isSupportedTabUrl(tab.url)) {
                this.hideCard();
                return;
            }

            if (options.tabId && tab.id !== options.tabId) {
                return;
            }

            if (options.storageUrl && !this.isSamePageUrl(options.storageUrl, tab.url)) {
                return;
            }

            const snapshot = await this.fetchFromActiveTab(tab);
            this.snapshot = snapshot;
            this.render(snapshot);
        } catch (err) {
            this.hideCard();
        } finally {
            this._refreshing = false;
        }
    },

    async fetchFromActiveTab(tab) {
        if (!tab?.id) {
            throw new Error('未找到活动标签页');
        }

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PRODUCT_INFO' });
            if (response?.success) return response;
            throw new Error(response?.error || '内容脚本无响应');
        } catch (err) {
            const storage = await chrome.storage.local.get([
                'url', 'designerName', 'designerLink', 'designId',
                'cpProductId', 'productImageId', 'productsData'
            ]);

            if (this.isSamePageUrl(storage.url, tab.url) &&
                (storage.designId || storage.cpProductId || storage.productsData)) {
                return this.buildSnapshotFromStorage(storage);
            }

            throw err;
        }
    },

    buildSnapshotFromStorage(storage) {
        const fields = [];
        const push = (label, value) => {
            if (value !== undefined && value !== null && value !== 'Not found') {
                fields.push({ label, value: String(value) });
            }
        };
        push('Designer', storage.designerName);
        push('Design ID', storage.designId);
        push('CP Product ID', storage.cpProductId);
        push('Product Image ID', storage.productImageId);
        if (storage.productsData?.category_id !== undefined) {
            push('Category ID', storage.productsData.category_id);
        }
        return {
            isProductPage: fields.length > 0,
            url: storage.url || '',
            fields,
            textSummary: fields.map((f) => `${f.label}: ${f.value}`).join('\n')
        };
    },

    render(snapshot) {
        const card = document.getElementById('product-context-card');
        const body = document.getElementById('product-context-body');
        if (!card || !body) return;

        if (!snapshot?.isProductPage || !snapshot.fields?.length) {
            this.hideCard();
            return;
        }

        const stateKey = this.getSnapshotKey(snapshot);
        if (stateKey === this._lastStateKey) return;

        this._lastStateKey = stateKey;
        this.snapshot = snapshot;
        card.classList.remove('hidden');

        const rows = snapshot.fields.map((field) => {
            const valueHtml = field.link
                ? `<a href="${field.link}" target="_blank" rel="noopener">${this.escapeHtml(field.value)}</a>`
                : this.escapeHtml(field.value);
            return `
                <div class="product-context-row">
                    <span class="product-context-label">${this.escapeHtml(field.label)}</span>
                    <span class="product-context-value">${valueHtml}</span>
                </div>
            `;
        }).join('');

        body.innerHTML = rows;
    },

    insertIntoChatInput() {
        if (!this.snapshot?.textSummary) return;
        const input = document.getElementById('chat-input');
        if (!input) return;

        const block = `【当前产品信息】\n${this.snapshot.textSummary}\n\n`;
        input.value = block + input.value;
        input.focus();
    },

    getContextForChat() {
        if (!this.snapshot?.isProductPage || !this.snapshot.textSummary) return '';
        return `【当前产品信息】\n${this.snapshot.textSummary}`;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
};
