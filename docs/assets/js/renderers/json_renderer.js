/**
 * JSON Renderer - Ratkaisee JSON "[object Object]" ongelman
 * Muuntaa JavaScript objektit JSON-tekstiksi oikeassa muodossa
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.json_renderer = {
    
    /**
     * Renderöi JSON sisältö
     * KRIITTINEN: Muuntaa objektit tekstiksi JSON.stringify():llä
     */
    render: async function(content, fileName, filePath) {
        // KRIITTINEN KORJAUS: Muunna objekti → JSON teksti
        let jsonText = '';
        let parseError = null;
        let isValidJson = false;
        
        try {
            if (typeof content === 'object' && content !== null) {
                // Content on JavaScript objekti - muunna JSON stringiksi
                jsonText = JSON.stringify(content, null, 2);
                isValidJson = true;
            } else if (typeof content === 'string') {
                // Content on string - tarkista onko se JSON
                if (content === '[object Object]') {
                    // Korruptoitunut sisältö
                    jsonText = '{\n  "error": "Content was corrupted during loading",\n  "original": "' + content + '"\n}';
                } else {
                    // Koita parsia ja formatoida
                    try {
                        const parsed = JSON.parse(content);
                        jsonText = JSON.stringify(parsed, null, 2);
                        isValidJson = true;
                    } catch (error) {
                        // Ei valid JSON, käytä sellaisenaan
                        jsonText = content;
                        parseError = error.message;
                    }
                }
            } else {
                // Muut tyypit (number, boolean, null jne)
                jsonText = JSON.stringify(content, null, 2);
                isValidJson = true;
            }
        } catch (error) {
            // JSON.stringify epäonnistui
            jsonText = '{\n  "error": "Failed to convert to JSON",\n  "message": "' + error.message + '",\n  "originalType": "' + typeof content + '"\n}';
            parseError = error.message;
        }
        
        // Laske rivimäärä
        const lineCount = jsonText.split('\n').length;
        
        // Luo header info
        const headerClass = isValidJson ? '' : 'error';
        const statusText = isValidJson ? 'Valid JSON' : 'Invalid JSON';
        
        // Luo HTML
        let html = `<div class="json-content">`;
        
        // Debug info (näkyy sivulla kehitysvaiheessa)
        if (window.DEBUG_MODE) {
            html += `<div class="json-debug-info">
                <strong>🔍 JSON Debug:</strong><br>
                📁 File: ${fileName}<br>
                📋 Original type: ${typeof content}<br>
                ✓ Valid JSON: ${isValidJson}<br>
                📏 Lines: ${lineCount}<br>
                ${parseError ? `❌ Parse error: ${parseError}<br>` : ''}
            </div>`;
        }
        
        // JSON header
        html += `<div class="json-header ${headerClass}">
            <span class="file-type-label">${statusText}</span>
            <span class="json-size">${lineCount} lines</span>
            ${parseError ? `<span class="error-message">Error: ${parseError}</span>` : ''}
        </div>`;
        
        // JSON content with syntax highlighting
        html += `<pre class="language-json"><code class="language-json">${this.escapeHtml(jsonText)}</code></pre>`;
        
        html += `</div>`;
        
        return html;
    },
    
    /**
     * Post-processing: syntax highlighting
     */
    postProcess: async function(contentArea, content, fileName) {
        try {
            // Syntax highlighting jos Prism on saatavilla
            if (typeof MarkdownProcessor !== 'undefined' && MarkdownProcessor.highlightCode) {
                MarkdownProcessor.highlightCode(contentArea);
            }
            
            // Copy-to-clipboard toiminnot
            this.addCopyButtons(contentArea);
            
            // JSON-specific styles
            this.addJsonStyles();
            
        } catch (error) {
            // Silent error handling - ei console.error
        }
    },
    
    /**
     * Lisää copy-napit
     */
    addCopyButtons: function(container) {
        const codeBlocks = container.querySelectorAll('pre > code');
        codeBlocks.forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            
            // Tarkista onko nappi jo lisätty
            if (pre.querySelector('.copy-code-btn')) return;
            
            const button = document.createElement('button');
            button.className = 'copy-code-btn';
            button.innerHTML = '📋';
            button.title = 'Copy JSON';
            
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
     * Lisää JSON-specifit tyylit
     */
    addJsonStyles: function() {
        if (document.getElementById('json-renderer-styles')) {
            return; // Jo lisätty
        }
        
        const style = document.createElement('style');
        style.id = 'json-renderer-styles';
        style.textContent = `
            .json-content {
                margin: 1rem 0;
            }
            
            .json-debug-info {
                background: #e0f2fe;
                border: 1px solid #0284c7;
                padding: 0.75rem;
                margin-bottom: 1rem;
                border-radius: 6px;
                font-family: monospace;
                font-size: 0.8rem;
                color: #0c4a6e;
            }
            
            .json-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0.75rem 1rem;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-bottom: none;
                border-radius: 6px 6px 0 0;
                font-size: 0.875rem;
            }
            
            .json-header.error {
                background: #fef2f2;
                border-color: #fecaca;
                color: #dc2626;
            }
            
            .file-type-label {
                font-weight: 600;
                color: #374151;
            }
            
            .json-header.error .file-type-label {
                color: #dc2626;
            }
            
            .json-size {
                color: #6b7280;
                font-size: 0.8rem;
            }
            
            .error-message {
                color: #dc2626;
                font-size: 0.8rem;
                font-style: italic;
            }
            
            .json-content pre {
                margin: 0;
                border-radius: 0 0 6px 6px;
                border-top: none;
                max-height: 600px;
                overflow-y: auto;
            }
            
            .json-content code {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                line-height: 1.5;
                font-size: 0.875rem;
            }
            
            /* JSON syntax highlighting (kun Prism latautuu) */
            .language-json .token.property {
                color: #0066cc !important;
            }
            
            .language-json .token.string {
                color: #690 !important;
            }
            
            .language-json .token.number {
                color: #905 !important;
            }
            
            .language-json .token.boolean {
                color: #c90 !important;
            }
            
            .language-json .token.null {
                color: #999 !important;
            }
            
            .language-json .token.punctuation {
                color: #999 !important;
            }
        `;
        
        document.head.appendChild(style);
    },
    
    /**
     * Escape HTML entities
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Validoi JSON string
     */
    isValidJson: function(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Pretty print JSON
     */
    prettyPrint: function(obj, indent = 2) {
        try {
            return JSON.stringify(obj, null, indent);
        } catch (error) {
            return `{
  "error": "Cannot serialize object",
  "message": "${error.message}",
  "type": "${typeof obj}"
}`;
        }
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
    module.exports = json_renderer;
}
