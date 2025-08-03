/**
 * TXT Renderer - Käsittelee .txt tiedostot
 * Yksinkertainen tekstitiedostojen näyttö
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.txt_renderer = {
    
    /**
     * Renderöi tekstitiedosto
     */
    render: async function(content, fileName, filePath) {
        // Varmista että content on string
        const textContent = typeof content === 'object' ? 
            JSON.stringify(content, null, 2) : 
            String(content);
        
        // Analysoi teksti
        const analysis = this.analyzeText(textContent, fileName);
        
        let html = '<div class="txt-content" id="main-txt-content">';
        
        // Text info header
        html += this.createTextHeader(fileName, analysis);
        
        // Text content
        html += `<pre class="text-display">${this.escapeHtml(textContent)}</pre>`;
        
        html += '</div>';
        
        return html;
    },
    
    /**
     * Post-processing: copy buttons ja styles
     */
    postProcess: async function(contentArea, content, fileName) {
        try {
            // Copy button
            this.addCopyButton(contentArea);
            
            // Text styles
            this.addTextStyles();
            
        } catch (error) {
            // Silent error handling
        }
    },
    
    /**
     * Analysoi tekstitiedosto
     */
    analyzeText: function(content, fileName) {
        const lines = content.split('\n');
        
        const analysis = {
            lineCount: lines.length,
            charCount: content.length,
            wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
            isEmpty: content.trim().length === 0,
            isLarge: lines.length > 1000,
            likelyType: this.guessTextType(content, fileName)
        };
        
        return analysis;
    },
    
    /**
     * Arvaa tekstin tyyppi
     */
    guessTextType: function(content, fileName) {
        const lowerContent = content.toLowerCase();
        const lowerFileName = fileName.toLowerCase();
        
        // Config files
        if (lowerFileName.includes('config') || lowerContent.includes('=') || lowerContent.includes(':')) {
            return 'config';
        }
        
        // Log files
        if (lowerFileName.includes('log') || lowerContent.includes('error') || lowerContent.includes('warning')) {
            return 'log';
        }
        
        // Documentation
        if (lowerFileName.includes('readme') || lowerFileName.includes('license') || lowerFileName.includes('changelog')) {
            return 'documentation';
        }
        
        // Data files
        if (lowerContent.includes(',') && lines.length > 2) {
            return 'data';
        }
        
        return 'text';
    },
    
    /**
     * Luo text header
     */
    createTextHeader: function(fileName, analysis) {
        const typeIcon = this.getTypeIcon(analysis.likelyType);
        const typeName = this.getTypeName(analysis.likelyType);
        
        return `<div class="txt-header">
            <div class="file-type-info">
                <span class="file-type-label">${typeIcon} ${typeName}</span>
                <span class="file-stats">${analysis.lineCount} lines, ${analysis.wordCount} words</span>
            </div>
            <div class="text-stats">
                ${analysis.isEmpty ? '<span class="warning">⚠️ Empty file</span>' : ''}
                ${analysis.isLarge ? '<span class="info">📄 Large file</span>' : ''}
                <span class="char-count">${analysis.charCount} characters</span>
            </div>
        </div>`;
    },
    
    /**
     * Copy-nappi
     */
    addCopyButton: function(container) {
        const textDisplay = container.querySelector('.text-display');
        if (!textDisplay) return;
        
        if (textDisplay.querySelector('.copy-code-btn')) return;
        
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.innerHTML = '📋';
        button.title = 'Copy text content';
        
        button.addEventListener('click', async () => {
            try {
                await Utils.copyToClipboard(textDisplay.textContent);
                button.innerHTML = '✅';
                setTimeout(() => button.innerHTML = '📋', 2000);
            } catch (error) {
                button.innerHTML = '❌';
                setTimeout(() => button.innerHTML = '📋', 2000);
            }
        });
        
        textDisplay.style.position = 'relative';
        textDisplay.appendChild(button);
    },
    
    /**
     * Text-specific styles
     */
    addTextStyles: function() {
        if (document.getElementById('txt-renderer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'txt-renderer-styles';
        style.textContent = `
            .txt-content {
                margin: 1rem 0;
            }
            
            .txt-header {
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
            
            .file-stats {
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            .text-stats {
                display: flex;
                gap: 1rem;
                align-items: center;
                font-size: 0.875rem;
                color: #6b7280;
                flex-wrap: wrap;
            }
            
            .warning {
                color: #d97706;
                font-weight: 500;
            }
            
            .info {
                color: #2563eb;
            }
            
            .char-count {
                color: #9ca3af;
                font-size: 0.8rem;
            }
            
            .text-display {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 0 0 6px 6px;
                border-top: none;
                padding: 1rem;
                overflow-x: auto;
                max-height: 600px;
                overflow-y: auto;
                font-family: 'Courier New', Consolas, Monaco, monospace;
                font-size: 0.875rem;
                line-height: 1.5;
                white-space: pre-wrap;
                word-wrap: break-word;
                margin: 0;
                position: relative;
            }
            
            .txt-content .copy-code-btn {
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
            
            .txt-content .copy-code-btn:hover {
                background: rgba(0, 0, 0, 0.7);
            }
        `;
        
        document.head.appendChild(style);
    },
    
    // Utility methods
    getTypeIcon: function(type) {
        const icons = {
            'config': '⚙️',
            'log': '📋',
            'documentation': '📚',
            'data': '📊',
            'text': '📄'
        };
        return icons[type] || '📄';
    },
    
    getTypeName: function(type) {
        const names = {
            'config': 'Configuration File',
            'log': 'Log File',
            'documentation': 'Documentation',
            'data': 'Data File',
            'text': 'Text File'
        };
        return names[type] || 'Text File';
    },
    
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
    module.exports = txt_renderer;
}
