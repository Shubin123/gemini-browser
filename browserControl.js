class BrowserController {
    constructor() {
        this.browserVisible = false;
        this.init();
    }

    async init() {
        this.browserVisible = await window.electronAPI.isBrowserVisible();
    }

    async toggle() {
        this.browserVisible = await window.electronAPI.toggleBrowserWindow();
        return this.browserVisible;
    }

    async navigate(url) {
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }
        return await window.electronAPI.controlBrowser('navigate', { url });
    }

    async execute(code) {
        return await window.electronAPI.controlBrowser('execute', { code });
    }

    async click(selector) {
        return await window.electronAPI.controlBrowser('click', { selector });
    }

    async input(selector, value) {
        return await window.electronAPI.controlBrowser('input', { selector, value });
    }

    async screenshot() {
        return await window.electronAPI.controlBrowser('screenshot');
    }

    async evaluate(selector, property) {
        const code = `(function() {
            const el = document.querySelector('${selector}');
            return el ? el.${property} : null;
        })()`;
        
        const result = await window.electronAPI.evaluateInBrowser(code);
        return result.success ? result.result : null;
    }

    async getDOM(selector = 'html') {
        const code = `(function() {
            const el = document.querySelector('${selector}');
            if (!el) return null;
            
            return {
                tagName: el.tagName,
                id: el.id,
                className: el.className,
                textContent: el.textContent,
                value: el.value,
                attributes: Array.from(el.attributes).map(attr => ({
                    name: attr.name,
                    value: attr.value
                })),
                children: el.children.length,
                boundingRect: el.getBoundingClientRect()
            };
        })()`;
        
        const result = await window.electronAPI.evaluateInBrowser(code);
        return result.success ? result.result : null;
    }
}

// Create global instance
window.browserController = new BrowserController();