// App router and global state
const AppState = {
    currentTab: 'chat',
    settings: null,
    pendingTab: null
};

const App = {
    init() {
        this.bindNavigation();
        this.handleDeepLink();
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.sidePanelTab) {
                this.switchTab(changes.sidePanelTab.newValue);
            }
        });
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });
    },

    switchTab(tabName) {
        AppState.currentTab = tabName;
        document.querySelectorAll('.nav-item').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.panel').forEach((panel) => {
            panel.classList.toggle('active', panel.id === `panel-${tabName}`);
        });

        if (tabName === 'knowledge' && typeof KnowledgeModule !== 'undefined') {
            KnowledgeModule.refreshDocList();
        }
        if (tabName === 'settings' && typeof SettingsModule !== 'undefined') {
            SettingsModule.loadSettings();
        }
        if (tabName === 'qrcode' && typeof QrcodeModule !== 'undefined') {
            QrcodeModule.onShow();
        }
        if (tabName === 'shipaddress' && typeof ShipAddressModule !== 'undefined') {
            ShipAddressModule.onShow();
        }
    },

    handleDeepLink() {
        chrome.storage.local.get(['sidePanelTab'], (result) => {
            if (result.sidePanelTab) {
                this.switchTab(result.sidePanelTab);
                chrome.storage.local.remove('sidePanelTab');
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
    SettingsModule.init().then(() => {
        ChatModule.init();
        TranslateModule.init();
        KnowledgeModule.init();
        QrcodeModule.init();
        ShipAddressModule.init();
        ToolsModule.init();
    });
});
