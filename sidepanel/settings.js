const SettingsModule = {
    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.populateModelSelect();
    },

    async loadSettings() {
        const key = CONFIG.LLM.SETTINGS_KEY;
        const result = await chrome.storage.local.get([key]);
        const defaults = {
            apiKeys: {},
            defaultProvider: CONFIG.LLM.DEFAULT_PROVIDER,
            defaultModel: CONFIG.LLM.PROVIDERS[CONFIG.LLM.DEFAULT_PROVIDER].models[0]
        };
        AppState.settings = { ...defaults, ...(result[key] || {}) };

        const providerModels = CONFIG.LLM.PROVIDERS[AppState.settings.defaultProvider]?.models || [];
        if (!providerModels.includes(AppState.settings.defaultModel)) {
            AppState.settings.defaultModel = providerModels[0] || defaults.defaultModel;
        }

        this.renderSettingsForm();
        return AppState.settings;
    },

    renderSettingsForm() {
        const providerSelect = document.getElementById('settings-provider');
        const modelSelect = document.getElementById('settings-model');
        const keysContainer = document.getElementById('api-keys-container');
        if (!providerSelect) return;

        providerSelect.innerHTML = '';
        Object.entries(CONFIG.LLM.PROVIDERS).forEach(([id, cfg]) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = cfg.label;
            if (id === AppState.settings.defaultProvider) opt.selected = true;
            providerSelect.appendChild(opt);
        });

        this.updateModelOptions();
        if (modelSelect) {
            modelSelect.value = AppState.settings.defaultModel;
        }

        keysContainer.innerHTML = '';
        Object.entries(CONFIG.LLM.PROVIDERS).forEach(([id, cfg]) => {
            const group = document.createElement('div');
            group.className = 'api-key-group form-group';
            group.innerHTML = `
                <label>${cfg.label} API Key</label>
                <input type="password" data-provider="${id}" placeholder="sk-..." value="${AppState.settings.apiKeys[id] || ''}" />
            `;
            keysContainer.appendChild(group);
        });
    },

    updateModelOptions() {
        const providerSelect = document.getElementById('settings-provider');
        const modelSelect = document.getElementById('settings-model');
        if (!providerSelect || !modelSelect) return;

        const providerId = providerSelect.value;
        const models = CONFIG.LLM.PROVIDERS[providerId]?.models || [];
        modelSelect.innerHTML = '';
        models.forEach((m) => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = m;
            modelSelect.appendChild(opt);
        });
    },

    populateModelSelect() {
        const select = document.getElementById('model-select');
        if (!select || !AppState.settings) return;

        select.innerHTML = '';
        Object.entries(CONFIG.LLM.PROVIDERS).forEach(([providerId, cfg]) => {
            cfg.models.forEach((model) => {
                const opt = document.createElement('option');
                opt.value = `${providerId}::${model}`;
                opt.textContent = `${cfg.label} / ${model}`;
                if (providerId === AppState.settings.defaultProvider && model === AppState.settings.defaultModel) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
        });
    },

    getSelectedModel() {
        const val = document.getElementById('model-select')?.value || '';
        const [providerId, model] = val.split('::');
        return { providerId, model };
    },

    async getApiKey(providerId) {
        const settings = AppState.settings || await this.loadSettings();
        return settings.apiKeys?.[providerId] || '';
    },

    bindEvents() {
        document.getElementById('settings-provider')?.addEventListener('change', () => {
            this.updateModelOptions();
        });

        document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
            const provider = document.getElementById('settings-provider').value;
            const model = document.getElementById('settings-model').value;
            const apiKeys = {};
            document.querySelectorAll('#api-keys-container input[data-provider]').forEach((input) => {
                apiKeys[input.dataset.provider] = input.value.trim();
            });

            const settings = { apiKeys, defaultProvider: provider, defaultModel: model };
            await chrome.storage.local.set({ [CONFIG.LLM.SETTINGS_KEY]: settings });
            AppState.settings = settings;
            this.populateModelSelect();

            const status = document.getElementById('settings-status');
            status.textContent = '设置已保存';
            status.classList.remove('error');
            setTimeout(() => { status.textContent = ''; }, 2000);
        });
    }
};
