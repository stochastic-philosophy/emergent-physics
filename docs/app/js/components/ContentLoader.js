// app/js/components/ContentLoader.js
export class ContentLoader {
    constructor() {
        this.cache = new Map();
        this.marked = window.marked;
        
        // Configure marked
        this.marked.setOptions({
            highlight: function(code, lang) {
                if (window.Prism && window.Prism.languages[lang]) {
                    return window.Prism.highlight(code, window.Prism.languages[lang], lang);
                }
                return code;
            },
            breaks: true,
            gfm: true
        });
    }
    
    async loadMarkdown(path) {
        // Check cache first
        if (this.cache.has(path)) {
            console.log(`📦 Loading from cache: ${path}`);
            return this.cache.get(path);
        }
        
        try {
            console.log(`📄 Loading markdown: ${path}`);
            
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const markdown = await response.text();
            const html = this.marked.parse(markdown);
            
            const content = {
                markdown,
                html,
                path,
                loadedAt: new Date()
            };
            
            // Cache the result
            this.cache.set(path, content);
            
            return content;
            
        } catch (error) {
            console.error(`Failed to load markdown: ${path}`, error);
            throw error;
        }
    }
    
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Content cache cleared');
    }
    
    getCacheSize() {
        return this.cache.size;
    }
}
