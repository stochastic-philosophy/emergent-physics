/**
 * MD Renderer - Käsittelee .md tiedostot
 * Yksinkertainen versio joka delegoi MarkdownProcessor:lle
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.md_renderer = {
    
    /**
     * Renderöi Markdown sisältö
     */
    render: async function(content, fileName, filePath) {
        // Varmista että content on string
        const markdownText = typeof content === 'object' ? 
            JSON.stringify(content, null, 2) : 
            String(content);
        
        // Renderöi markdown HTML:ksi
        let html = '<div class="markdown-content" id="main-markdown-content">';
        
        if (typeof MarkdownProcessor !== 'undefined') {
            try {
                const rendered = await MarkdownProcessor.processCombined(markdownText);
                html += rendered;
            } catch (error) {
                html += this.renderPlainMarkdown(markdownText);
            }
        } else {
            html += this.renderPlainMarkdown(markdownText);
        }
        
        html += '</div>';
        
        return html;
    },
    
    /**
     * Post-processing: LaTeX ja syntax highlighting
     */
    postProcess: async function(contentArea, content, fileName) {
        try {
            // LaTeX math rendering
            if (typeof MarkdownProcessor !== 'undefined' && MarkdownProcessor.renderMath) {
                await MarkdownProcessor.renderMath(contentArea);
            }
            
            // Syntax highlighting
            if (typeof MarkdownProcessor !== 'undefined' && MarkdownProcessor.highlightCode) {
                MarkdownProcessor.highlightCode(contentArea);
            }
            
            // Markdown enhancements
            this.addMarkdownEnhancements(contentArea);
            
        } catch (error) {
            // Silent error handling
        }
    },
    
    /**
     * Plain markdown rendering (fallback)
     */
    renderPlainMarkdown: function(content) {
        // Yksinkertainen markdown → HTML muunnos
        let html = this.escapeHtml(content);
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold and italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Paragraphs
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';
        
        return html;
    },
    
    /**
     * Lisää markdown-specifisiä parannuksia
     */
    addMarkdownEnhancements: function(container) {
        // Copy buttons koodiblokeille
        this.addCopyButtons(container);
        
        // Table responsive wrappers
        this.wrapTables(container);
        
        // Heading anchors
        this.addHeadingAnchors(container);
    },
    
    /**
     * Copy-napit koodiblokeille
     */
    addCopyButtons: function(container) {
        const codeBlocks = container.querySelectorAll('pre > code');
        codeBlocks.forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            
            if (pre.querySelector('.copy-code-btn')) return;
            
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
                    button.innerHTML = '❌';
                    setTimeout(() => button.innerHTML = '📋', 2000);
                }
            });
            
            pre.style.position = 'relative';
            pre.appendChild(button);
        });
    },
    
    /**
     * Tee taulukoista responsiivisia
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
     * Lisää ankkurit otsikoihin
     */
    addHeadingAnchors: function(container) {
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(heading => {
            if (heading.id && !heading.querySelector('.heading-anchor')) {
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
     * Escape HTML
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua theme-debugin tapaan
    // console.log ei toimi tableteilla
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = md_renderer;
}
