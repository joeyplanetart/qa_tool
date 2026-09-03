// Token usage parsing and formatting utilities
const TokenUtils = {
    parseUsage(data, provider) {
        if (!data) return null;

        if (provider === 'anthropic') {
            const usage = data.usage || data.message?.usage;
            if (!usage) return null;
            return {
                promptTokens: usage.input_tokens || 0,
                completionTokens: usage.output_tokens || 0,
                totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0)
            };
        }

        const usage = data.usage;
        if (!usage) return null;
        return {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
        };
    },

    formatUsage(usage) {
        if (!usage) return '';
        return `输入 ${usage.promptTokens} / 输出 ${usage.completionTokens} / 合计 ${usage.totalTokens} tokens`;
    },

    sumUsage(usages) {
        return (usages || []).reduce(
            (acc, u) => ({
                promptTokens: acc.promptTokens + (u?.promptTokens || 0),
                completionTokens: acc.completionTokens + (u?.completionTokens || 0),
                totalTokens: acc.totalTokens + (u?.totalTokens || 0)
            }),
            { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        );
    }
};

if (typeof self !== 'undefined') {
    self.TokenUtils = TokenUtils;
}
if (typeof window !== 'undefined') {
    window.TokenUtils = TokenUtils;
}
