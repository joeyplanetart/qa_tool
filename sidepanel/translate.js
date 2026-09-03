const TranslateModule = {
    init() {
        document.getElementById('btn-translate')?.addEventListener('click', () => this.translate());
        document.getElementById('translate-swap')?.addEventListener('click', () => this.swapLangs());
    },

    swapLangs() {
        const src = document.getElementById('translate-source-lang');
        const tgt = document.getElementById('translate-target-lang');
        if (src.value === 'auto') return;
        const tmp = src.value;
        src.value = tgt.value;
        tgt.value = tmp;
    },

    async translate() {
        const text = document.getElementById('translate-source').value.trim();
        if (!text) return;

        const sourceLang = document.getElementById('translate-source-lang').value;
        const targetLang = document.getElementById('translate-target-lang').value;
        const targetEl = document.getElementById('translate-target');
        const usageEl = document.getElementById('translate-usage');
        const btn = document.getElementById('btn-translate');

        targetEl.value = '';
        usageEl.textContent = '翻译中...';
        btn.disabled = true;

        const { providerId, model } = SettingsModule.getSelectedModel();
        const apiKey = await SettingsModule.getApiKey(providerId);

        if (apiKey) {
            this.translateWithLLM(text, sourceLang, targetLang, providerId, model, targetEl, usageEl, btn);
        } else {
            this.translateWithMyMemory(text, sourceLang, targetLang, targetEl, usageEl, btn);
        }
    },

    translateWithLLM(text, sourceLang, targetLang, providerId, model, targetEl, usageEl, btn) {
        const port = chrome.runtime.connect({ name: 'llm-stream' });
        let content = '';

        port.onMessage.addListener((msg) => {
            if (msg.type === 'chunk') {
                content += msg.content;
                targetEl.value = content;
            }
            if (msg.type === 'done') {
                usageEl.textContent = msg.usage ? TokenUtils.formatUsage(msg.usage) : '';
                btn.disabled = false;
            }
            if (msg.type === 'error') {
                usageEl.textContent = '';
                this.translateWithMyMemory(text, sourceLang, targetLang, targetEl, usageEl, btn);
            }
        });

        port.postMessage({
            type: 'LLM_TRANSLATE',
            text,
            sourceLang,
            targetLang,
            providerId,
            model
        });
    },

    async translateWithMyMemory(text, sourceLang, targetLang, targetEl, usageEl, btn) {
        const langMap = { zh: 'zh-CN', en: 'en', auto: 'auto' };
        const src = langMap[sourceLang] || sourceLang;
        const tgt = langMap[targetLang] || targetLang;
        const langPair = src === 'auto' ? `auto|${tgt}` : `${src}|${tgt}`;

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.responseStatus === 200) {
                targetEl.value = data.responseData.translatedText;
                usageEl.textContent = 'MyMemory 免费翻译（无 Token 统计）';
            } else {
                targetEl.value = '';
                usageEl.textContent = '翻译失败: ' + (data.responseDetails || '未知错误');
                usageEl.classList.add('error');
            }
        } catch (err) {
            targetEl.value = '';
            usageEl.textContent = '翻译失败: ' + err.message;
        }
        btn.disabled = false;
    }
};
