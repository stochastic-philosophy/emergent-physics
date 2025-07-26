/**
 * Markdown Processor - Markdown, LaTeX ja koodin renderöinti
 * Handles Markdown to HTML conversion, LaTeX math rendering, and code highlighting
 */

window.MarkdownProcessor = {
    
    // Configuration
    config: {
        markedOptions: {
            breaks: true,
            gfm: true,
            headerIds: true,
            pedantic: false,
            sanitize: false,
            smartLists: true,
            smartypants: true,
            xhtml: false
        },
        mathJaxConfig: {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']],
                processEscapes: true,
                processEnvironments: true,
                packages: ['base', 'ams', 'noerrors', 'noundefined']
            },
            svg: {
                fontCache: 'global'
            },
            options: {
                skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
                ignoreHtmlClass: 'no-mathjax'
            }
        },
        prismConfig: {
            languages: ['python', 'javascript', 'r', 'json', 'html', 'css', 'markdown', 'bash'],
            plugins: ['line-numbers', 'show-language', 'copy-to-clipboard']
        }
    },
    
    // State
    state: {
        markedLoaded: false,
        mathJaxLoaded: false,
        prismLoaded: false,
        loadingPromises: {}
    },
    
    /**
     * Initialize the processor by loading external libraries
     */
    init: async function() {
        DEBUG.info('Initializing MarkdownProcessor...');
        
        try {
            await Promise.all([
                this.loadMarked(),
                this.loadMathJax(),
                this.loadPrism()
            ]);
            
            DEBUG.success('MarkdownProcessor initialized successfully');
        } catch (error) {
            DEBUG.reportError(error, 'MarkdownProcessor initialization failed');
            throw error;
        }
    },
    
    /**
     * Load Marked.js for markdown processing
     */
    loadMarked: async function() {
        if (this.state.markedLoaded || typeof marked !== 'undefined') {
            this.state.markedLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.marked) {
            return this.state.loadingPromises.marked;
        }
        
        this.state.loadingPromises.marked = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js';
            script.onload = () => {
                this.state.markedLoaded = true;
                this.configureMarked();
                DEBUG.success('Marked.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load Marked.js');
                reject(new Error('Failed to load Marked.js'));
            };
            document.head.appendChild(script);
        });
        
        return this.state.loadingPromises.marked;
    },
    
    /**
     * Load MathJax for LaTeX rendering
     */
    loadMathJax: async function() {
        if (this.state.mathJaxLoaded || (window.MathJax && window.MathJax.typesetPromise)) {
            this.state.mathJaxLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.mathjax) {
            return this.state.loadingPromises.mathjax;
        }
        
        this.state.loadingPromises.mathjax = new Promise((resolve, reject) => {
            // Configure MathJax before loading
            window.MathJax = this.config.mathJaxConfig;
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.2/es5/tex-mml-chtml.min.js';
            script.async = true;
            script.onload = () => {
                this.state.mathJaxLoaded = true;
                DEBUG.success('MathJax loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load MathJax');
                reject(new Error('Failed to load MathJax'));
            };
            document.head.appendChild(script);
        });
        
        return this.state.loadingPromises.mathjax;
    },
    
    /**
     * Load Prism.js for code highlighting
     */
    loadPrism: async function() {
        if (this.state.prismLoaded || typeof Prism !== 'undefined') {
            this.state.prismLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.prism) {
            return this.state.loadingPromises.prism;
        }
        
        this.state.loadingPromises.prism = new Promise((resolve, reject) => {
            // Load main Prism script
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js';
            script.onload = () => {
                // Load additional language support
                this.loadPrismLanguages().then(() => {
                    this.state.prismLoaded = true;
                    DEBUG.success('Prism.js loaded successfully');
                    resolve();
                });
            };
            script.onerror = () => {
                DEBUG.error('Failed to load Prism.js');
                reject(new Error('Failed to load Prism.js'));
            };
            document.head.appendChild(script);
            
            // Load Prism CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
            document.head.appendChild(link);
        });
        
        return this.state.loadingPromises.prism;
    },
    
    /**
     * Load additional Prism language support
     */
    loadPrismLanguages: async function() {
        const languages = ['python', 'javascript', 'r', 'json'];
        const promises = languages.map(lang => {
            return new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-${lang}.min.js`;
                script.onload = resolve;
                script.onerror = resolve; // Continue even if some languages fail
                document.head.appendChild(script);
            });
        });
        
        await Promise.all(promises);
    },
    
    /**
     * Configure Marked.js options
     */
    configureMarked: function() {
        if (typeof marked === 'undefined') return;
        
        marked.setOptions(this.config.markedOptions);
        
        // Custom renderer for better integration
        const renderer = new marked.Renderer();
        
        // Enhance code block rendering
        renderer.code = function(code, language) {
            const validLang = language && Prism.languages[language] ? language : 'text';
            return `<pre class="language-${validLang}"><code class="language-${validLang}">${code}</code></pre>`;
        };
        
        // Enhance link rendering (open external links in new tab)
        renderer.link = function(href, title, text) {
            const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
            const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const titleAttr = title ? ` title="${title}"` : '';
            return `<a href="${href}"${titleAttr}${target}>${text}</a>`;
        };
        
        // Add table classes for styling
        renderer.table = function(header, body) {
            return `<div class="table-container"><table class="markdown-table">${header}${body}</table></div>`;
        };
        
        marked.setOptions({ renderer });
    },
    
    /**
     * Render markdown to HTML
     */
    renderMarkdown: function(content) {
        if (!this.state.markedLoaded || typeof marked === 'undefined') {
            DEBUG.warn('Marked.js not loaded, returning escaped content');
            return this.escapeHtml(content);
        }
        
        try {
            return marked.parse(content);
        } catch (error) {
            DEBUG.reportError(error, 'Markdown rendering failed');
            return this.escapeHtml(content);
        }
    },
    
    /**
     * Render LaTeX math in element
     */
    renderMath: async function(element) {
        if (!this.state.mathJaxLoaded || !window.MathJax || !window.MathJax.typesetPromise) {
            DEBUG.warn('MathJax not loaded, skipping math rendering');
            return;
        }
        
        try {
            await window.MathJax.typesetPromise([element]);
            DEBUG.info('Math rendering completed');
        } catch (error) {
            DEBUG.reportError(error, 'Math rendering failed');
        }
    },
    
    /**
     * Highlight code in element
     */
    highlightCode: function(element) {
        if (!this.state.prismLoaded || typeof Prism === 'undefined') {
            DEBUG.warn('Prism.js not loaded, skipping code highlighting');
            return;
        }
        
        try {
            Prism.highlightAllUnder(element);
            DEBUG.info('Code highlighting completed');
        } catch (error) {
            DEBUG.reportError(error, 'Code highlighting failed');
        }
    },
    
    /**
     * Process markdown with math and code highlighting
     */
    processCombined: async function(content, options = {}) {
        DEBUG.info('Processing combined markdown content...');
        
        try {
            // Ensure libraries are loaded
            if (!this.state.markedLoaded || !this.state.mathJaxLoaded || !this.state.prismLoaded) {
                await this.init();
            }
            
            // Step 1: Convert Markdown to HTML
            let html = this.renderMarkdown(content);
            
            // Step 2: Create temporary container for processing
            const container = document.createElement('div');
            container.innerHTML = html;
            
            // Step 3: Highlight code blocks
            this.highlightCode(container);
            
            // Step 4: Process mathematics
            await this.renderMath(container);
            
            // Step 5: Add additional enhancements
            this.enhanceContent(container, options);
            
            const result = container.innerHTML;
            DEBUG.success('Combined processing completed successfully');
            
            return result;
            
        } catch (error) {
            DEBUG.reportError(error, 'Combined processing failed');
            return this.escapeHtml(content);
        }
    },
    
    /**
     * Enhance processed content with additional features
     */
    enhanceContent: function(container, options = {}) {
        try {
            // Add copy buttons to code blocks
            if (options.addCopyButtons !== false) {
                this.addCopyButtons(container);
            }
            
            // Add table wrappers for responsive tables
            this.wrapTables(container);
            
            // Add heading anchors
            if (options.addHeadingAnchors !== false) {
                this.addHeadingAnchors(container);
            }
            
            // Process footnotes
            this.processFootnotes(container);
            
        } catch (error) {
            DEBUG.reportError(error, 'Content enhancement failed');
        }
    },
    
    /**
     * Add copy buttons to code blocks
     */
    addCopyButtons: function(container) {
        const codeBlocks = container.querySelectorAll('pre > code');
        codeBlocks.forEach((codeBlock, index) => {
            const pre = codeBlock.parentElement;
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.innerHTML = '📋';
            button.title = 'Copy code';
            button.addEventListener('click', async () => {
                try {
                    await Utils.copyToClipboard(codeBlock.textContent);
                    button.innerHTML = '✅';
                    setTimeout(() => button.innerHTML = '📋', 2000);
                } catch (error) {
                    DEBUG.error('Failed to copy code:', error);
                    button.innerHTML = '❌';
                    setTimeout(() => button.innerHTML = '📋', 2000);
                }
            });
            
            pre.style.position = 'relative';
            pre.appendChild(button);
        });
    },
    
    /**
     * Wrap tables for responsive design
     */
    wrapTables: function(container) {
        const tables = container.querySelectorAll('table:not(.wrapped)');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-container';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            table.classList.add('wrapped');
        });
    },
    
    /**
     * Add anchor links to headings
     */
    addHeadingAnchors: function(container) {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            if (heading.id) {
                const anchor = document.createElement('a');
                anchor.href = `#${heading.id}`;
                anchor.className = 'heading-anchor';
                anchor.innerHTML = '🔗';
                anchor.title = 'Link to this section';
                heading.appendChild(anchor);
            }
        });
    },
    
    /**
     * Process footnotes
     */
    processFootnotes: function(container) {
        // Simple footnote implementation
        const footnotePattern = /\[\^(\w+)\]/g;
        const content = container.innerHTML;
        
        // Find footnote references and definitions
        const footnotes = new Map();
        let match;
        
        // This is a basic implementation - could be enhanced
        while ((match = footnotePattern.exec(content)) !== null) {
            const footnoteId = match[1];
            if (!footnotes.has(footnoteId)) {
                footnotes.set(footnoteId, footnotes.size + 1);
            }
        }
        
        // Replace footnote references with links
        if (footnotes.size > 0) {
            let processedContent = content;
            for (const [id, number] of footnotes) {
                processedContent = processedContent.replace(
                    new RegExp(`\\[\\^${id}\\]`, 'g'),
                    `<sup><a href="#footnote-${id}" id="footnote-ref-${id}">${number}</a></sup>`
                );
            }
            container.innerHTML = processedContent;
        }
    },
    
    /**
     * Escape HTML for safe display
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Get processor status
     */
    getStatus: function() {
        return {
            markedLoaded: this.state.markedLoaded,
            mathJaxLoaded: this.state.mathJaxLoaded,
            prismLoaded: this.state.prismLoaded,
            fullyLoaded: this.state.markedLoaded && this.state.mathJaxLoaded && this.state.prismLoaded
        };
    },
    
    /**
     * Preload all libraries
     */
    preload: async function() {
        DEBUG.info('Preloading MarkdownProcessor libraries...');
        return this.init();
    }
};

// CSS for enhanced features
const processorCSS = `
.copy-code-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    font-size: 0.75rem;
    z-index: 10;
}

.copy-code-btn:hover {
    background: rgba(0, 0, 0, 0.7);
}

.table-container {
    overflow-x: auto;
    margin: 1rem 0;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 6px;
}

.markdown-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 500px;
}

.markdown-table th,
.markdown-table td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    text-align: left;
}

.markdown-table th {
    background: var(--card-background, #f8fafc);
    font-weight: 600;
}

.heading-anchor {
    margin-left: 0.5rem;
    opacity: 0;
    transition: opacity 0.2s;
    text-decoration: none;
    font-size: 0.8em;
}

h1:hover .heading-anchor,
h2:hover .heading-anchor,
h3:hover .heading-anchor,
h4:hover .heading-anchor,
h5:hover .heading-anchor,
h6:hover .heading-anchor {
    opacity: 1;
}

.math-display {
    margin: 1rem 0;
    padding: 1rem;
    background: var(--code-background, #f8fafc);
    border: 1px solid var(--code-border, #e2e8f0);
    border-radius: 6px;
    overflow-x: auto;
}

pre[class*="language-"] {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
}
`;

// Add CSS to document
if (!document.getElementById('markdown-processor-styles')) {
    const style = document.createElement('style');
    style.id = 'markdown-processor-styles';
    style.textContent = processorCSS;
    document.head.appendChild(style);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('MarkdownProcessor module loaded successfully');
});

/**
 * Export for Node.js compatibility (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownProcessor;
}
