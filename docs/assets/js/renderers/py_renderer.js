/**
 * PY Renderer - Käsittelee .py tiedostot  
 * Syntax highlighting ja Python-specific ominaisuudet
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.py_renderer = {
    
    /**
     * Renderöi Python koodi
     */
    render: async function(content, fileName, filePath) {
        // Varmista että content on string
        const pythonCode = typeof content === 'object' ? 
            JSON.stringify(content, null, 2) : 
            String(content);
        
        // Analysoi Python koodi
        const analysis = this.analyzePythonCode(pythonCode);
        
        let html = '<div class="code-content python-content" id="main-code-content">';
        
        // Python info header
        html += this.createPythonHeader(fileName, analysis);
        
        // Python koodi syntax highlightingilla
        html += `<pre class="language-python"><code class="language-python">${this.escapeHtml(pythonCode)}</code></pre>`;
        
        // Python-specific info
        if (analysis.hasMainBlock || analysis.imports.length > 0 || analysis.functions.length > 0) {
            html += this.createPythonInfo(analysis);
        }
        
        html += '</div>';
        
        return html;
    },
    
    /**
     * Post-processing: syntax highlighting
     */
    postProcess: async function(contentArea, content, fileName) {
        try {
            // Syntax highlighting
            if (typeof MarkdownProcessor !== 'undefined' && MarkdownProcessor.highlightCode) {
                MarkdownProcessor.highlightCode(contentArea);
            }
            
            // Python-specific enhancements
            this.addPythonEnhancements(contentArea);
            
        } catch (error) {
            // Silent error handling
        }
    },
    
    /**
     * Analysoi Python koodia
     */
    analyzePythonCode: function(code) {
        const lines = code.split('\n');
        const analysis = {
            lineCount: lines.length,
            imports: [],
            functions: [],
            classes: [],
            hasMainBlock: false,
            comments: 0,
            docstrings: 0
        };
        
        let inDocstring = false;
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Imports
            if (trimmed.match(/^(import|from)\s+\w+/)) {
                analysis.imports.push({
                    line: index + 1,
                    text: trimmed
                });
            }
            
            // Functions
            const funcMatch = trimmed.match(/^def\s+(\w+)\s*\(/);
            if (funcMatch) {
                analysis.functions.push({
                    name: funcMatch[1],
                    line: index + 1,
                    isPrivate: funcMatch[1].startsWith('_')
                });
            }
            
            // Classes
            const classMatch = trimmed.match(/^class\s+(\w+)/);
            if (classMatch) {
                analysis.classes.push({
                    name: classMatch[1],
                    line: index + 1
                });
            }
            
            // Main block
            if (trimmed.includes('if __name__ == "__main__"')) {
                analysis.hasMainBlock = true;
            }
            
            // Comments
            if (trimmed.startsWith('#')) {
                analysis.comments++;
            }
            
            // Docstrings
            if (trimmed.includes('"""') || trimmed.includes("'''")) {
                inDocstring = !inDocstring;
                if (!inDocstring) analysis.docstrings++;
            }
        });
        
        return analysis;
    },
    
    /**
     * Luo Python header
     */
    createPythonHeader: function(fileName, analysis) {
        return `<div class="python-header">
            <div class="file-type-info">
                <span class="file-type-label">🐍 Python Script</span>
                <span class="line-count">${analysis.lineCount} lines</span>
            </div>
            <div class="python-stats">
                ${analysis.functions.length > 0 ? `<span class="stat">🔧 ${analysis.functions.length} functions</span>` : ''}
                ${analysis.classes.length > 0 ? `<span class="stat">📦 ${analysis.classes.length} classes</span>` : ''}
                ${analysis.imports.length > 0 ? `<span class="stat">📥 ${analysis.imports.length} imports</span>` : ''}
                ${analysis.hasMainBlock ? `<span class="stat">▶️ Executable</span>` : ''}
            </div>
        </div>`;
    },
    
    /**
     * Luo Python info section
     */
    createPythonInfo: function(analysis) {
        let html = '<div class="python-info">';
        
        // Imports
        if (analysis.imports.length > 0) {
            html += '<div class="python-section">';
            html += '<h4>📥 Imports</h4>';
            html += '<ul class="python-list">';
            analysis.imports.forEach(imp => {
                html += `<li><code>${this.escapeHtml(imp.text)}</code> <span class="line-ref">(line ${imp.line})</span></li>`;
            });
            html += '</ul></div>';
        }
        
        // Functions
        if (analysis.functions.length > 0) {
            html += '<div class="python-section">';
            html += '<h4>🔧 Functions</h4>';
            html += '<ul class="python-list">';
            analysis.functions.forEach(func => {
                const icon = func.isPrivate ? '🔒' : '🔧';
                html += `<li>${icon} <code>${this.escapeHtml(func.name)}</code> <span class="line-ref">(line ${func.line})</span></li>`;
            });
            html += '</ul></div>';
        }
        
        // Classes
        if (analysis.classes.length > 0) {
            html += '<div class="python-section">';
            html += '<h4>📦 Classes</h4>';
            html += '<ul class="python-list">';
            analysis.classes.forEach(cls => {
                html += `<li>📦 <code>${this.escapeHtml(cls.name)}</code> <span class="line-ref">(line ${cls.line})</span></li>`;
            });
            html += '</ul></div>';
        }
        
        html += '</div>';
        return html;
    },
    
    /**
     * Python-specific parannukset
     */
    addPythonEnhancements: function(container) {
        // Copy button
        this.addCopyButton(container);
        
        // Python styles
        this.addPythonStyles();
    },
    
    /**
     * Copy-nappi
     */
    addCopyButton: function(container) {
        const codeBlock = container.querySelector('pre > code');
        if (!codeBlock) return;
        
        const pre = codeBlock.parentElement;
        if (pre.querySelector('.copy-code-btn')) return;
        
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.innerHTML = '📋';
        button.title = 'Copy Python code';
        
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
    },
    
    /**
     * Python-specific styles
     */
    addPythonStyles: function() {
        if (document.getElementById('py-renderer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'py-renderer-styles';
        style.textContent = `
            .python-content {
                margin: 1rem 0;
            }
            
            .python-header {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-bottom: none;
                border-radius: 6px 6px 0 0;
                padding: 0.75rem 1rem;
            }
            
            .file-type-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .file-type-label {
                font-weight: 600;
                color: #374151;
            }
            
            .line-count {
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            .python-stats {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }
            
            .stat {
                font-size: 0.75rem;
                color: #6b7280;
                background: #e5e7eb;
                padding: 0.25rem 0.5rem;
                border-radius: 4px;
            }
            
            .python-info {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 6px 6px;
                padding: 1rem;
                margin-top: -1px;
            }
            
            .python-section {
                margin-bottom: 1rem;
            }
            
            .python-section:last-child {
                margin-bottom: 0;
            }
            
            .python-section h4 {
                margin: 0 0 0.5rem 0;
                font-size: 0.875rem;
                color: #374151;
            }
            
            .python-list {
                list-style: none;
                margin: 0;
                padding: 0;
            }
            
            .python-list li {
                padding: 0.25rem 0;
                font-size: 0.875rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .python-list code {
                background: #e5e7eb;
                padding: 0.125rem 0.25rem;
                border-radius: 3px;
                font-size: 0.8rem;
            }
            
            .line-ref {
                color: #9ca3af;
                font-size: 0.75rem;
                margin-left: auto;
            }
            
            /* Python syntax highlighting enhancements */
            .language-python .token.keyword {
                color: #0066cc !important;
                font-weight: bold;
            }
            
            .language-python .token.string {
                color: #690 !important;
            }
            
            .language-python .token.function {
                color: #dd4a68 !important;
            }
            
            .language-python .token.comment {
                color: #999 !important;
                font-style: italic;
            }
        `;
        
        document.head.appendChild(style);
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
    module.exports = py_renderer;
}
