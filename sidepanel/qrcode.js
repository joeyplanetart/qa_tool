const QrcodeModule = {
    init() {
        document.getElementById('btn-generate-qrcode')?.addEventListener('click', () => {
            const text = document.getElementById('qrcode-input')?.value?.trim();
            this.generateQRCode(text);
        });

        document.getElementById('btn-regenerate-qrcode')?.addEventListener('click', () => {
            this.loadFromCurrentTab();
        });

        document.getElementById('btn-clear-qrcode')?.addEventListener('click', () => {
            const input = document.getElementById('qrcode-input');
            const display = document.getElementById('qrcode-display');
            if (input) input.value = '';
            if (display) {
                display.innerHTML = '<div class="qrcode-placeholder">在此显示二维码</div>';
            }
        });

        document.getElementById('qrcode-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = e.target.value.trim();
                this.generateQRCode(text);
            }
        });
    },

    onShow() {
        const input = document.getElementById('qrcode-input');
        if (!input || input.value.trim()) return;
        this.loadFromCurrentTab();
    },

    async loadFromCurrentTab() {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = tabs[0]?.url || '';
        const input = document.getElementById('qrcode-input');

        if (!currentUrl || currentUrl.startsWith('chrome')) {
            if (input) input.value = '';
            const display = document.getElementById('qrcode-display');
            if (display) {
                display.innerHTML = '<div class="qrcode-placeholder qrcode-error">当前标签页无可用地址</div>';
            }
            return false;
        }

        if (input) input.value = currentUrl;
        this.generateQRCode(currentUrl);
        return true;
    },

    generateQRCode(text) {
        const display = document.getElementById('qrcode-display');
        if (!display) return;

        if (!text) {
            display.innerHTML = '<div class="qrcode-placeholder">请输入文本或 URL 生成二维码</div>';
            return;
        }

        display.innerHTML = '<div class="qrcode-placeholder">正在生成二维码...</div>';

        const encodedText = encodeURIComponent(text);
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedText}`;

        const img = document.createElement('img');
        img.src = qrCodeUrl;
        img.alt = 'QR Code';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.style.borderRadius = '4px';

        img.onload = () => {
            display.innerHTML = '';
            display.appendChild(img);
        };

        img.onerror = () => {
            display.innerHTML = '<div class="qrcode-placeholder qrcode-error">生成失败，请重试</div>';
        };
    }
};
