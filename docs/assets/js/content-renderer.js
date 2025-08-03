/**
 * Content Renderer - Compatible with Fixed PDF Generator
 * Core file rendering with reliable PDF integration
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
        console.log('Initializing ContentRenderer (Compatible)...');
    },
    
    /**
     * View file content (Main entry point)
     */
    viewFile: async function(filePath) {
        console.log(`=== VIEWING FILE: ${filePath} ===`);
        
        try {
            UI.showLoading('Loading file content...');
            
            // Detect file type
            const fileType = FileManager.detectFileType(filePath);
            console.log(`File type detected: ${fileType}`);
            
            // Check if file is viewable
            if (!FileManager.isViewable(filePath)) {
                UI.hideLoading();
                UI.showError(`File type not supported for viewing: ${fileType}`, true);
                return;
            }
            
            // Load file content
            const content = await FileManager.loadFile(filePath);
            console.log(`File content loaded: ${content.length} characters`);
            
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
            console.log(`✅ File viewing completed: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ Failed to view file: ${filePath}`, error);
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
                html += '<div class="markdown-content" id="main-markdown-content">';
                html += await this.renderMarkdownContent(content);
                html += '</div>';
                break;
                
            case 'code':
                const language = this.detectCodeLanguage(fileName);
                html += `<div class="code-content" id="main-code-content">`;
                html += `<pre class="language-${language}"><code class="language-${language}">${Utils.escapeHtml(content)}</code></pre>`;
                html += `</div>`;
                break;
                
            case 'data':
                html += '<div class="data-content" id="main-data-content">';
                html += await this.renderDataContent(content, fileName);
                html += '</div>';
                break;
                
            case 'images':
                html += '<div class="image-content" id="main-image-content">';
                html += this.renderImageContent(filePath, fileName);
                html += '</div>';
                break;
                
            default:
                html += `<div class="text-content" id="main-text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
        
        html += `</div>`;
        
        contentArea.innerHTML = html;
        
        // Apply post-rendering enhancements
        await this.applyPostRenderingEnhancements(contentArea, fileType);
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        console.log(`✅ Content rendered successfully: ${fileType}`);
    },
    
    /**
     * Render markdown content
     */
    renderMarkdownContent: async function(content) {
        if (typeof MarkdownProcessor === 'undefined') {
            console.warn('MarkdownProcessor not available, returning escaped content');
            return Utils.escapeHtml(content);
        }
        
        try {
            const rendered = await MarkdownProcessor.processCombined(content, this.state.renderingOptions);
            console.log(`Markdown processed: ${rendered.length} chars output`);
            return rendered;
        } catch (error) {
            console.error('Markdown rendering failed:', error);
            return Utils.escapeHtml(content);
        }
    },
    
    /**
     * Render data content (JSON, CSV, etc.) - FULL DEBUG VERSION
     */
    renderDataContent: async function(content, fileName) {
        if (fileName.endsWith('.json')) {
            // EXTENSIVE DEBUGGING
            console.log('=== JSON RENDERING DEBUG ===');
            console.log('1. Raw content type:', typeof content);
            console.log('2. Raw content value:', content);
            console.log('3. Content constructor:', content ? content.constructor.name : 'null');
            console.log('4. Is Array:', Array.isArray(content));
            console.log('5. String conversion test:', String(content));
            
            let finalJsonString = '';
            let debugInfo = '';
            
            try {
                // Method 1: Direct object check
                if (content && typeof content === 'object' && content.constructor === Object) {
                    console.log('6. Detected: Plain JavaScript object');
                    finalJsonString = JSON.stringify(content, null, 2);
                    debugInfo = 'Converted from JavaScript object';
                }
                // Method 2: Array check  
                else if (Array.isArray(content)) {
                    console.log('6. Detected: JavaScript array');
                    finalJsonString = JSON.stringify(content, null, 2);
                    debugInfo = 'Converted from JavaScript array';
                }
                // Method 3: String that might be JSON
                else if (typeof content === 'string') {
                    console.log('6. Detected: String, testing if JSON...');
                    if (content === '[object Object]') {
                        // This is the corrupted case
                        console.log('7. CORRUPTED: Found [object Object] string');
                        finalJsonString = '{\n  "error": "Data was corrupted during loading",\n  "message": "File content was converted to [object Object] string"\n}';
                        debugInfo = 'ERROR: Corrupted object string detected';
                    } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                        // Looks like JSON, try to parse and reformat
                        try {
                            const parsed = JSON.parse(content);
                            finalJsonString = JSON.stringify(parsed, null, 2);
                            debugInfo = 'Parsed and reformatted JSON string';
                            console.log('7. Successfully parsed JSON string');
                        } catch (parseError) {
                            console.log('7. JSON parse failed:', parseError.message);
                            finalJsonString = content; // Show as-is
                            debugInfo = 'Invalid JSON string, showing raw content';
                        }
                    } else {
                        // Regular string, not JSON
                        console.log('7. Regular string, not JSON format');
                        finalJsonString = content;
                        debugInfo = 'Plain text content';
                    }
                }
                // Method 4: Other types
                else {
                    console.log('6. Detected: Other type, attempting conversion...');
                    if (content === null) {
                        finalJsonString = 'null';
                        debugInfo = 'Null value';
                    } else if (content === undefined) {
                        finalJsonString = 'undefined';
                        debugInfo = 'Undefined value';
                    } else {
                        // Last resort - try to stringify whatever it is
                        try {
                            finalJsonString = JSON.stringify(content, null, 2);
                            debugInfo = 'Stringified unknown type';
                        } catch (stringifyError) {
                            finalJsonString = String(content);
                            debugInfo = 'Forced string conversion';
                        }
                    }
                }
                
                console.log('8. Final JSON length:', finalJsonString.length);
                console.log('9. Debug info:', debugInfo);
                console.log('=== END JSON DEBUG ===');
                
                return `<div class="json-content">
                    <div class="json-header">
                        <span class="file-type-label">JSON Data</span>
                        <span class="json-size">${finalJsonString.split('\n').length} lines</span>
                    </div>
                    <div class="debug-info" style="padding: 0.5rem; background: #e0f2fe; border: 1px solid #0284c7; margin-bottom: 0; font-size: 0.75rem; color: #0284c7;">
                        Debug: ${debugInfo}
                    </div>
                    <pre class="language-json"><code class="language-json">${Utils.escapeHtml(finalJsonString)}</code></pre>
                </div>`;
                
            } catch (error) {
                console.error('=== JSON RENDERING ERROR ===');
                console.error('Error:', error);
                console.error('Content that caused error:', content);
                console.error('========================');
                
                return `<div class="json-content">
                    <div class="json-header error">
                        <span class="file-type-label">JSON Error</span>
                        <span class="error-message">Rendering failed</span>
                    </div>
                    <div class="debug-info" style="padding: 0.5rem; background: #fef2f2; border: 1px solid #dc2626; margin-bottom: 0; font-size: 0.75rem; color: #dc2626;">
                        Error: ${error.message}
                    </div>
                    <pre class="language-text"><code class="language-text">${Utils.escapeHtml(String(content))}</code></pre>
                </div>`;
            }
        } else if (fileName.endsWith('.csv')) {
            return this.renderCSVContent(content);
        } else {
            // For non-JSON data files, ensure we have a string
            const contentString = typeof content === 'string' ? content : String(content);
            return `<div class="text-content"><pre>${Utils.escapeHtml(contentString)}</pre></div>`;
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
            console.error('CSV parsing failed:', error);
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
                    console.log('Code highlighting applied');
                }
            }
            
            // Apply math rendering for markdown
            if (fileType === 'markdown' && typeof MarkdownProcessor !== 'undefined') {
                await MarkdownProcessor.renderMath(contentArea);
                console.log('Math rendering applied');
            }
            
            // Add additional enhancements
            this.addContentEnhancements(contentArea);
            
            // Add JSON-specific styles if needed
            if (fileType === 'data' && this.state.currentFile.endsWith('.json')) {
                this.addJSONStyles();
            }
            
        } catch (error) {
            console.error('Post-rendering enhancement failed:', error);
        }
    },
    
    /**
     * Add content enhancements (copy buttons, tables, etc.)
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
                        console.error('Failed to copy code:', error);
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
        
        // Add heading anchors (if not already processed)
        const headings = contentArea.querySelectorAll('h1, h2, h3, h4, h5, h6');
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
        
        console.log('Content enhancements applied');
    },
    
    /**
     * Add JSON-specific styles
     */
    addJSONStyles: function() {
        if (document.getElementById('json-content-styles')) {
            return; // Styles already added
        }
        
        const style = document.createElement('style');
        style.id = 'json-content-styles';
        style.textContent = `
            .json-content {
                margin: 1rem 0;
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
            }
            
            .json-content pre {
                margin: 0;
                border-radius: 0 0 6px 6px;
                border-top: none;
            }
            
            .json-content code {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                line-height: 1.5;
            }
            
            /* JSON syntax highlighting improvements */
            .language-json .token.property {
                color: #0066cc;
            }
            
            .language-json .token.string {
                color: #690;
            }
            
            .language-json .token.number {
                color: #905;
            }
            
            .language-json .token.boolean {
                color: #c90;
            }
            
            .language-json .token.null {
                color: #999;
            }
        `;
        
        document.head.appendChild(style);
        console.log('JSON styles added');
    },
    
    /**
     * Detect programming language from filename
     */
    detectCodeLanguage: function(fileName) {
        const extension = Utils.getFileExtension(fileName);
        return this.config.supportedLanguages[extension] || 'text';
    },
    
    /**
     * Download file (trigger browser download) - DIRECT DOWNLOAD WITHOUT MODIFICATION
     */
    downloadFile: async function(filePath) {
        console.log(`=== DOWNLOADING FILE: ${filePath} ===`);
        
        try {
            const fileName = filePath.split('/').pop();
            const fileExtension = Utils.getFileExtension(fileName);
            
            // Check if file is downloadable
            if (!FileManager.isDownloadable(filePath)) {
                UI.showNotification(`File type not supported for download: ${fileExtension}`, 'warning');
                return;
            }
            
            // DIRECT DOWNLOAD - No file processing, just trigger browser download
            const link = document.createElement('a');
            link.href = filePath;
            link.download = fileName; // This tells browser to download instead of navigate
            link.style.display = 'none';
            
            // Add to document temporarily
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            
            console.log(`✅ File download triggered: ${filePath}`);
            
            if (UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Lataus aloitettu' : 'Download started';
                UI.showNotification(message, 'success');
            }
            
        } catch (error) {
            console.error(`❌ Failed to download file: ${filePath}`, error);
            if (UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Lataus epäonnistui' : 'Download failed';
                UI.showNotification(message, 'error');
            }
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
        this.state.viewHistory = this.state.viewHistory.filter(path => path !== filePath);
        this.state.viewHistory.unshift(filePath);
        
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
    console.log('ContentRenderer (Compatible) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentRenderer;
}
