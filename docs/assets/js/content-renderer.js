/**
 * Content Renderer - Sisällön renderöinti ja esittäminen
 * Handles file viewing, content rendering, and file downloads
 */

window.ContentRenderer = {
    
    // State specific to content rendering
    state: {
        currentFile: null,
        renderingOptions: {},
        viewHistory: []
    },
    
    // Configuration
    config: {
        maxHistorySize: 20,
        supportedLanguages: {
            'py': 'python',
            'js': 'javascript',
            'r': 'r',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'sh': 'bash',
            'txt': 'text'
        }
    },
    
    /**
     * Initialize ContentRenderer
     */
    init: function() {
        DEBUG.info('Initializing ContentRenderer...');
    },
    
    /**
     * View file content (Main entry point)
     */
    viewFile: async function(filePath) {
        DEBUG.info(`=== VIEWING FILE: ${filePath} ===`);
        
        try {
            UI.showLoading('Loading file content...');
            
            // Detect file type
            const fileType = FileManager.detectFileType(filePath);
            DEBUG.info(`File type detected: ${fileType}`);
            
            // Check if file is viewable
            if (!FileManager.isViewable(filePath)) {
                UI.hideLoading();
                UI.showError(`File type not supported for viewing: ${fileType}`, true);
                return;
            }
            
            // Load file content
            const content = await FileManager.loadFile(filePath);
            
            // Update state
            this.state.currentFile = filePath;
            this.addToHistory(filePath);
            
            // Update App state if available
            if (typeof App !== 'undefined' && App.setState) {
                App.setState({ currentFile: filePath });
            }
            
            // Render content based on file type
            await this.renderFileContent(content, fileType, filePath);
            
            // Update URL
            if (typeof NavigationManager !== 'undefined') {
                const projectId = ProjectManager.getCurrentProject();
                const fileName = filePath.split('/').pop();
                NavigationManager.updateUrl(projectId, fileName);
            }
            
            // Update page title
            const fileName = filePath.split('/').pop();
            const displayName = Utils.filenameToDisplayName(fileName);
            const projectId = ProjectManager.getCurrentProject();
            UI.updatePageTitle(`${displayName} - ${projectId}`);
            
            UI.hideLoading();
            DEBUG.success(`File viewing completed: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to view file: ${filePath}`);
            UI.hideLoading();
            UI.showError(`Failed to load file: ${error.message}`, true);
        }
    },
    
    /**
     * Render file content based on type
     */
    renderFileContent: async function(content, fileType, filePath) {
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
            throw new Error('Content area not found');
        }
        
        const currentLang = UI.getCurrentLanguage();
        const backText = currentLang === 'fi' ? '← Takaisin projektiin' : '← Back to Project';
        const fileName = filePath.split('/').pop();
        const displayName = Utils.filenameToDisplayName(fileName);
        
        let html = `<div class="file-content">`;
        html += `
            <nav class="file-navigation">
                ${UI.createBackButton(backText)}
                <div class="file-info">
                    <h1>${Utils.escapeHtml(displayName)}</h1>
                    <span class="file-type-badge">${fileType}</span>
                </div>
                <div class="file-actions">
                    <button onclick="ContentRenderer.downloadFile('${filePath}')" class="download-file-btn">
                        ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                    </button>
                </div>
            </nav>
        `;
        
        // Render content based on file type
        switch (fileType) {
            case 'markdown':
                html += '<div class="markdown-content">';
                html += await this.renderMarkdownContent(content);
                html += '</div>';
                break;
                
            case 'code':
                const language = this.detectCodeLanguage(fileName);
                html += `<div class="code-content">`;
                html += `<pre class="language-${language}"><code class="language-${language}">${Utils.escapeHtml(content)}</code></pre>`;
                html += `</div>`;
                break;
                
            case 'data':
                html += await this.renderDataContent(content, fileName);
                break;
                
            case 'images':
                html += this.renderImageContent(filePath, fileName);
                break;
                
            default:
                html += `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
        
        html += `</div>`;
        
        contentArea.innerHTML = html;
        
        // Apply post-rendering enhancements
        await this.applyPostRenderingEnhancements(contentArea, fileType);
        
        // Scroll to top
        window.scrollTo(0, 0);
    },
    
    /**
     * Render markdown content
     */
    renderMarkdownContent: async function(content) {
        if (typeof MarkdownProcessor === 'undefined') {
            DEBUG.warn('MarkdownProcessor not available, returning escaped content');
            return Utils.escapeHtml(content);
        }
        
        try {
            return await MarkdownProcessor.processCombined(content, this.state.renderingOptions);
        } catch (error) {
            DEBUG.reportError(error, 'Markdown rendering failed');
            return Utils.escapeHtml(content);
        }
    },
    
    /**
     * Render data content (JSON, CSV, etc.)
     */
    renderDataContent: async function(content, fileName) {
        if (fileName.endsWith('.json')) {
            try {
                const jsonData = typeof content === 'string' ? JSON.parse(content) : content;
                return `<div class="json-content">
                    <pre class="language-json"><code class="language-json">${Utils.escapeHtml(JSON.stringify(jsonData, null, 2))}</code></pre>
                </div>`;
            } catch (e) {
                return `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
            }
        } else if (fileName.endsWith('.csv')) {
            return this.renderCSVContent(content);
        } else {
            return `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
    },
    
    /**
     * Render CSV content as table
     */
    renderCSVContent: function(content) {
        try {
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 0) return '<div class="text-content">Empty CSV file</div>';
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            const rows = lines.slice(1, Math.min(lines.length, 101)); // Limit to 100 rows for performance
            
            let html = '<div class="csv-content"><div class="table-container">';
            html += '<table class="csv-table">';
            
            // Headers
            html += '<thead><tr>';
            headers.forEach(header => {
                html += `<th>${Utils.escapeHtml(header)}</th>`;
            });
            html += '</tr></thead>';
            
            // Rows
            html += '<tbody>';
            rows.forEach(row => {
                const cells = row.split(',').map(c => c.trim().replace(/"/g, ''));
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td>${Utils.escapeHtml(cell)}</td>`;
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            
            if (lines.length > 101) {
                html += `<p class="csv-truncated">Showing first 100 rows of ${lines.length - 1} total rows.</p>`;
            }
            
            html += '</div>';
            return html;
            
        } catch (error) {
            DEBUG.error('CSV parsing failed:', error);
            return `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
    },
    
    /**
     * Render image content
     */
    renderImageContent: function(filePath, fileName) {
        return `<div class="image-content">
            <img src="${filePath}" alt="${Utils.escapeHtml(fileName)}" style="max-width: 100%; height: auto;" />
        </div>`;
    },
    
    /**
     * Apply post-rendering enhancements
     */
    applyPostRenderingEnhancements: async function(contentArea, fileType) {
        try {
            // Apply syntax highlighting if needed
            if (fileType === 'code' || (fileType === 'data' && this.state.currentFile.endsWith('.json'))) {
                if (typeof MarkdownProcessor !== 'undefined') {
                    MarkdownProcessor.highlightCode(contentArea);
                }
            }
            
            // Apply math rendering for markdown
            if (fileType === 'markdown' && typeof MarkdownProcessor !== 'undefined') {
                await MarkdownProcessor.renderMath(contentArea);
            }
            
            // Add additional enhancements
            this.addContentEnhancements(contentArea);
            
        } catch (error) {
            DEBUG.reportError(error, 'Post-rendering enhancement failed');
        }
    },
    
    /**
     * Add content enhancements (copy buttons, etc.)
     */
    addContentEnhancements: function(contentArea) {
        // Add copy buttons to code blocks
        const codeBlocks = contentArea.querySelectorAll('pre > code');
        codeBlocks.forEach(codeBlock => {
            const pre = codeBlock.parentElement;
            if (!pre.querySelector('.copy-code-btn')) {
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
            }
        });
        
        // Make tables responsive
        const tables = contentArea.querySelectorAll('table:not(.wrapped)');
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
     * Detect programming language from filename
     */
    detectCodeLanguage: function(fileName) {
        const extension = Utils.getFileExtension(fileName);
        return this.config.supportedLanguages[extension] || 'text';
    },
    
    /**
     * Download file (trigger browser download)
     */
    downloadFile: async function(filePath) {
        DEBUG.info(`=== DOWNLOADING FILE: ${filePath} ===`);
        
        try {
            // Check if file is downloadable
            if (!FileManager.isDownloadable(filePath)) {
                const fileName = filePath.split('/').pop();
                UI.showNotification(`File type not supported for download: ${Utils.getFileExtension(fileName)}`, 'warning');
                return;
            }
            
            await FileManager.downloadFile(filePath);
            DEBUG.success(`File download completed: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to download file: ${filePath}`);
            UI.showNotification('Failed to download file', 'error');
        }
    },
    
    /**
     * Get current file
     */
    getCurrentFile: function() {
        return this.state.currentFile;
    },
    
    /**
     * Add file to view history
     */
    addToHistory: function(filePath) {
        // Remove existing entry if present
        this.state.viewHistory = this.state.viewHistory.filter(path => path !== filePath);
        
        // Add to beginning
        this.state.viewHistory.unshift(filePath);
        
        // Limit history size
        if (this.state.viewHistory.length > this.config.maxHistorySize) {
            this.state.viewHistory = this.state.viewHistory.slice(0, this.config.maxHistorySize);
        }
    },
    
    /**
     * Get view history
     */
    getHistory: function() {
        return this.state.viewHistory;
    },
    
    /**
     * Clear current file state
     */
    clearCurrentFile: function() {
        this.state.currentFile = null;
    },
    
    /**
     * Set rendering options
     */
    setRenderingOptions: function(options) {
        this.state.renderingOptions = { ...this.state.renderingOptions, ...options };
    },
    
    /**
     * Get rendering options
     */
    getRenderingOptions: function() {
        return this.state.renderingOptions;
    },
    
    /**
     * Check if content type is supported for viewing
     */
    isViewable: function(filePath) {
        return FileManager.isViewable(filePath);
    },
    
    /**
     * Check if content type is downloadable
     */
    isDownloadable: function(filePath) {
        return FileManager.isDownloadable(filePath);
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('ContentRenderer module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentRenderer;
}
