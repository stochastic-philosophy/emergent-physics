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
     * View file content (Main entry point) - EARLY DEBUG
     */
    viewFile: async function(filePath) {
        // IMMEDIATE DEBUG - show this first thing
        const immediateDebug = `
            <div id="immediate-debug" style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: orange; color: black; padding: 1rem; border-radius: 6px; z-index: 9999; font-family: monospace; font-size: 0.9rem; border: 2px solid red;">
                <strong>🚨 viewFile() CALLED!</strong><br>
                📁 File path: ${filePath}<br>
                🔍 File ends with .json: ${filePath.endsWith('.json')}<br>
                ⏰ Time: ${new Date().toLocaleTimeString()}<br>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', immediateDebug);
        
        console.log(`=== VIEWING FILE: ${filePath} ===`);
        
        try {
            UI.showLoading('Loading file content...');
            
            // Detect file type
            const fileType = FileManager.detectFileType(filePath);
            console.log(`File type detected: ${fileType}`);
            
            // Update debug with file type
            const debugElement = document.getElementById('immediate-debug');
            if (debugElement) {
                debugElement.innerHTML += `📊 File type: ${fileType}<br>`;
            }
            
            // Check if file is viewable
            if (!FileManager.isViewable(filePath)) {
                UI.hideLoading();
                UI.showError(`File type not supported for viewing: ${fileType}`, true);
                return;
            }
            
            // Update debug before loading
            if (debugElement) {
                debugElement.innerHTML += `🔄 About to call FileManager.loadFile()...<br>`;
            }
            
            // Load file content with debug
            const content = await FileManager.loadFile(filePath);
            
            // Update debug with loaded content info
            if (debugElement) {
                debugElement.innerHTML += `✅ FileManager.loadFile() completed<br>`;
                debugElement.innerHTML += `📋 Content type: ${typeof content}<br>`;
                debugElement.innerHTML += `🏗️ Constructor: ${content ? content.constructor.name : 'null'}<br>`;
                debugElement.innerHTML += `📏 Content sample: "${String(content).substring(0, 30)}..."<br>`;
            }
            
            // Update state
            this.state.currentFile = filePath;
            this.addToHistory(filePath);
            
            // Update App state if available
            if (typeof App !== 'undefined' && App.setState) {
                App.setState({ currentFile: filePath });
            }
            
            // Update debug before rendering
            if (debugElement) {
                debugElement.innerHTML += `🎨 About to render content...<br>`;
            }
            
            // Render content based on file type
            await this.renderFileContent(content, fileType, filePath);
            
            // Update debug after rendering
            if (debugElement) {
                debugElement.innerHTML += `✅ Rendering completed!<br>`;
                debugElement.style.background = 'green';
                debugElement.style.color = 'white';
            }
            
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
            
            // Remove debug after 15 seconds
            setTimeout(() => {
                const debugEl = document.getElementById('immediate-debug');
                if (debugEl) debugEl.remove();
            }, 15000);
            
            console.log(`✅ File viewing completed: ${filePath}`);
            
        } catch (error) {
            console.error(`❌ Failed to view file: ${filePath}`, error);
            
            // Update debug with error
            const debugElement = document.getElementById('immediate-debug');
            if (debugElement) {
                debugElement.innerHTML += `❌ ERROR: ${error.message}<br>`;
                debugElement.style.background = 'red';
                debugElement.style.color = 'white';
            }
            
            UI.hideLoading();
            UI.showError(`Failed to load file: ${error.message}`, true);
        }
    },
    
    /**
     * Render file content based on type - WITH DEBUG
     */
    renderFileContent: async function(content, fileType, filePath) {
        console.log('🔍 renderFileContent() called');
        console.log('🔍 Content type at entry:', typeof content);
        console.log('🔍 Content value at entry:', content);
        console.log('🔍 File type:', fileType);
        
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
        
        // Render content based on file type - FIXED JSON DETECTION
        switch (fileType) {
            case 'markdown':
                html += '<div class="markdown-content" id="main-markdown-content">';
                html += await this.renderMarkdownContent(content);
                html += '</div>';
                break;
                
            case 'code':
                // SPECIAL CHECK: If it's a .json file but detected as code, treat as JSON
                if (fileName.endsWith('.json')) {
                    console.log('🔧 OVERRIDE: .json file detected, using JSON renderer instead of code');
                    html += '<div class="data-content" id="main-data-content">';
                    const jsonContent = await this.renderDataContent(content, fileName);
                    html += jsonContent;
                    html += '</div>';
                } else {
                    // Normal code rendering for non-JSON files
                    const language = this.detectCodeLanguage(fileName);
                    // Ensure content is string for code rendering
                    const codeContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
                    html += `<div class="code-content" id="main-code-content">`;
                    html += `<pre class="language-${language}"><code class="language-${language}">${Utils.escapeHtml(codeContent)}</code></pre>`;
                    html += `</div>`;
                }
                break;
                
            case 'data':
                console.log('🔍 BEFORE renderDataContent() call');
                console.log('🔍 Content type before data render:', typeof content);
                console.log('🔍 Content value before data render:', content);
                
                html += '<div class="data-content" id="main-data-content">';
                const dataContent = await this.renderDataContent(content, fileName);
                html += dataContent;
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
     * Render data content (JSON, CSV, etc.) - VISIBLE DEBUG ON PAGE
     */
    renderDataContent: async function(content, fileName) {
        if (fileName.endsWith('.json')) {
            
            // Create debug info that will be visible on the page
            let debugInfo = '';
            debugInfo += `<div style="background: #e0f2fe; border: 1px solid #0284c7; padding: 1rem; margin: 1rem 0; border-radius: 6px; font-family: monospace; font-size: 0.8rem;">`;
            debugInfo += `<strong>🔍 JSON DEBUG INFO:</strong><br>`;
            debugInfo += `📁 File: ${fileName}<br>`;
            debugInfo += `📋 Content type: ${typeof content}<br>`;
            debugInfo += `🏗️ Constructor: ${content ? content.constructor.name : 'null'}<br>`;
            debugInfo += `📏 Content length: ${typeof content === 'string' ? content.length : 'N/A'}<br>`;
            debugInfo += `🔍 Is Array: ${Array.isArray(content)}<br>`;
            debugInfo += `📝 String conversion test: "${String(content).substring(0, 100)}..."<br>`;
            
            let jsonText = '';
            
            // ALWAYS convert JavaScript object to JSON text first
            if (typeof content === 'object' && content !== null) {
                // Content is a JavaScript object - convert to JSON string
                try {
                    jsonText = JSON.stringify(content, null, 2);
                    debugInfo += `✅ SUCCESS: Converted JavaScript object to JSON<br>`;
                    debugInfo += `📏 JSON length: ${jsonText.length} characters<br>`;
                } catch (error) {
                    jsonText = '{\n  "error": "Could not convert object to JSON",\n  "message": "' + error.message + '"\n}';
                    debugInfo += `❌ JSON.stringify() failed: ${error.message}<br>`;
                }
            } else if (typeof content === 'string') {
                // Content is already a string
                if (content === '[object Object]') {
                    jsonText = '{\n  "error": "Object was corrupted during loading"\n}';
                    debugInfo += `⚠️ FOUND CORRUPTED [object Object] string!<br>`;
                } else {
                    // Try to parse and reformat if it's a JSON string
                    try {
                        const parsed = JSON.parse(content);
                        jsonText = JSON.stringify(parsed, null, 2);
                        debugInfo += `✅ Reformatted JSON string<br>`;
                    } catch (parseError) {
                        // Not valid JSON, use as-is
                        jsonText = content;
                        debugInfo += `ℹ️ Using string content as-is (not valid JSON)<br>`;
                    }
                }
            } else {
                // Other types (number, boolean, null, etc.)
                jsonText = JSON.stringify(content, null, 2);
                debugInfo += `✅ Converted ${typeof content} to JSON<br>`;
            }
            
            debugInfo += `🏁 FINAL JSON TEXT LENGTH: ${jsonText.length}<br>`;
            debugInfo += `🔚 First 100 chars: "${jsonText.substring(0, 100)}..."<br>`;
            debugInfo += `</div>`;
            
            return `<div class="json-content">
                ${debugInfo}
                <div class="json-header">
                    <span class="file-type-label">JSON Data</span>
                    <span class="json-size">${jsonText.split('\n').length} lines</span>
                </div>
                <pre class="language-json"><code class="language-json">${Utils.escapeHtml(jsonText)}</code></pre>
            </div>`;
            
        } else if (fileName.endsWith('.csv')) {
            return this.renderCSVContent(content);
        } else {
            // For other data files, ensure string conversion
            const textContent = typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content);
            return `<div class="text-content"><pre>${Utils.escapeHtml(textContent)}</pre></div>`;
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
