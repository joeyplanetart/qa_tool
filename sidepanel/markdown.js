// Lightweight Markdown renderer for chat messages
const Markdown = {
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    render(text) {
        if (!text) return '';

        const placeholders = [];
        let src = this.escapeHtml(text);

        src = src.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, _lang, code) => {
            const key = `@@CODE${placeholders.length}@@`;
            placeholders.push(`<pre class="md-pre"><code>${code.trim()}</code></pre>`);
            return key;
        });

        src = src.replace(/`([^`\n]+)`/g, '<code class="md-code">$1</code>');
        src = src.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        src = src.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

        const lines = src.split('\n');
        const blocks = [];
        let listOpen = false;

        const closeList = () => {
            if (listOpen) {
                blocks.push('</ul>');
                listOpen = false;
            }
        };

        lines.forEach((line) => {
            const trimmed = line.trim();

            if (/^@@CODE\d+@@$/.test(trimmed)) {
                closeList();
                blocks.push(trimmed);
                return;
            }

            if (/^[-*] /.test(trimmed)) {
                if (!listOpen) {
                    blocks.push('<ul class="md-list">');
                    listOpen = true;
                }
                blocks.push(`<li>${trimmed.slice(2)}</li>`);
                return;
            }

            closeList();

            if (!trimmed) {
                blocks.push('<div class="md-spacer"></div>');
                return;
            }

            if (/^#{1,3}\s/.test(trimmed)) {
                const level = trimmed.match(/^#+/)[0].length;
                const title = trimmed.replace(/^#+\s/, '');
                blocks.push(`<h${Math.min(level + 2, 6)} class="md-heading">${title}</h${Math.min(level + 2, 6)}>`);
                return;
            }

            blocks.push(`<p class="md-p">${trimmed}</p>`);
        });

        closeList();

        let html = blocks.join('');
        placeholders.forEach((block, i) => {
            html = html.replace(`@@CODE${i}@@`, block);
        });

        return html;
    }
};

if (typeof window !== 'undefined') {
    window.Markdown = Markdown;
}
