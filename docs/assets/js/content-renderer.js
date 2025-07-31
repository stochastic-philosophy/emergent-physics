/**
 * Content Renderer - Bug Fixed Version
 * Core file rendering with improved PDF integration and content preparation
 * FIXED: Global function access, event handling, and cleanup issues
 */

window.ContentRenderer = {
    
    // State specific to content rendering
    state: {
        currentFile: null,
        renderingOptions: {},
        viewHistory: [],
        contentReady: false,
        imagesLoaded: false,
        mathRendered: false,
        imageLoadCount: 0,
        totalImages: 0
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
        },
        // ENHANCED: Timeouts for content loading
        timeouts: {
            imageLoad: 8000,      // 8 seconds for images
            mathRender: 6000,     // 6 seconds for MathJax
            contentReady: 2000    // 2 seconds for content stabilization
        }
    },
    
    /**
     * Initialize ContentRenderer
     */
    init: function() {
        DEBUG.info('Initializing Enhanced ContentRenderer...');
        this.setupContentObservers();
        
        // FIXED: Make image callback functions globally accessible
        window.ContentRenderer_onImageLoaded = this.onImageLoaded.bind(this);
        window.ContentRenderer_onImageError = this.onImageError.bind(this);
        window.ContentRenderer_generatePDFSafely = this.generatePDFSafely.bind(this);
        window.ContentRenderer_generatePDFWithOptions = this.generatePDFWithOptions.bind(this);
        window.ContentRenderer_downloadFile = this.downloadFile.bind(this);
    },
    
    /**
     * Setup observers to monitor content readiness - FIXED
     */
    setupContentObservers: function() {
        // Listen for image load events - FIXED: Better event handling
        document.addEventListener('load', (e) => {
            if (e.target && e.target.tagName === 'IMG') {
                DEBUG.info('Image loaded in content:', e.target.src);
                this.handleImageLoaded();
            }
        }, true);
        
        // Listen for MathJax completion - FIXED: Better MathJax detection
        if (typeof window.MathJax !== 'undefined') {
            // Set up MathJax callback if not already set
            if (!window.MathJax.startup) {
                window.MathJax.startup = {};
            }
            
            const self = this;
            const originalReady = window.MathJax.startup.ready;
            window.MathJax.startup.ready = function() {
                if (originalReady) originalReady.call(this);
                DEBUG.info('MathJax startup completed');
                self.state.mathRendered = true;
                self.checkContentReadiness();
            };
        }
    },
    
    /**
     * View file content (Main entry point) - ENHANCED
     */
    viewFile: async function(filePath) {
        DEBUG.info(`=== VIEWING FILE WITH ENHANCED PDF SUPPORT: ${filePath} ===`);
        
        try {
            UI.showLoading('Loading file content...');
            
            // Reset content readiness state
            this.resetContentReadiness();
            
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
            DEBUG.info(`File content loaded: ${content.length} characters`);
            
            // Update state
            this.state.currentFile = filePath;
            this.addToHistory(filePath);
            
            // Update App state if available
            if (typeof App !== 'undefined' && App.setState) {
                App.setState({ currentFile: filePath });
            }
            
            // Render content based on file type - ENHANCED
            await this.renderFileContentEnhanced(content, fileType, filePath);
            
            // Wait for content to be fully ready for PDF generation
            await this.waitForContentReadiness();
            
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
            DEBUG.success(`✅ File viewing completed with enhanced PDF support: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to view file: ${filePath}`);
            UI.hideLoading();
            UI.showError(`Failed to load file: ${error.message}`, true);
        }
    },
    
    /**
     * Render file content with enhanced PDF preparation - FIXED
     */
    renderFileContentEnhanced: async function(content, fileType, filePath) {
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
                    <div class="pdf-readiness-indicator" id="pdf-readiness-indicator">
                        <span class="indicator-dot" id="pdf-ready-dot">⏳</span>
                        <span class="indicator-text">${currentLang === 'fi' ? 'Valmistellaan PDF:ää...' : 'Preparing PDF...'}</span>
                    </div>
                    <button onclick="ContentRenderer_generatePDFSafely()" class="pdf-btn" title="Generate PDF" id="pdf-generate-btn" disabled>
                        ${currentLang === 'fi' ? '📄 PDF' : '📄 PDF'}
                    </button>
                    <button onclick="ContentRenderer_generatePDFWithOptions()" class="pdf-options-btn" title="PDF with options" id="pdf-options-btn" disabled>
                        ${currentLang === 'fi' ? '⚙️ PDF Asetukset' : '⚙️ PDF Options'}
                    </button>
                    <button onclick="ContentRenderer_downloadFile('${Utils.escapeHtml(filePath)}')" class="download-file-btn">
                        ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                    </button>
                </div>
            </nav>
        `;
        
        // Render content based on file type
        switch (fileType) {
            case 'markdown':
                html += '<div class="markdown-content" id="main-markdown-content">';
                html += await this.renderMarkdownContentEnhanced(content);
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
                html += this.renderImageContentEnhanced(filePath, fileName);
                html += '</div>';
                break;
                
            default:
                html += `<div class="text-content" id="main-text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
        
        html += `</div>`;
        
        contentArea.innerHTML = html;
        
        // Apply post-rendering enhancements with PDF preparation
        await this.applyPostRenderingEnhancementsEnhanced(contentArea, fileType);
        
        // Add PDF readiness styles
        this.addPDFReadinessStyles();
        
        // Start monitoring content readiness
        this.startContentReadinessMonitoring();
        
        // Scroll to top
        window.scrollTo(0, 0);
        
        DEBUG.success(`✅ Enhanced content rendered successfully: ${fileType}`);
    },
    
    /**
     * Render markdown content with enhanced PDF preparation - ENHANCED
     */
    renderMarkdownContentEnhanced: async function(content) {
        if (typeof MarkdownProcessor === 'undefined') {
            DEBUG.warn('MarkdownProcessor not available, returning escaped content');
            return Utils.escapeHtml(content);
        }
        
        try {
            // Use enhanced rendering options for PDF compatibility
            const enhancedOptions = {
                ...this.state.renderingOptions,
                addCopyButtons: true,
                addHeadingAnchors: true,
                enhancePDFCompatibility: true
            };
            
            const rendered = await MarkdownProcessor.processCombined(content, enhancedOptions);
            DEBUG.success(`Enhanced markdown processed: ${rendered.length} chars output`);
            return rendered;
        } catch (error) {
            DEBUG.reportError(error, 'Enhanced markdown rendering failed');
            return Utils.escapeHtml(content);
        }
    },
    
    /**
     * Render image content with enhanced loading - FIXED
     */
    renderImageContentEnhanced: function(filePath, fileName) {
        const imageId = `main-image-${Date.now()}`;
        
        return `<div class="image-content-enhanced">
            <img 
                id="${imageId}"
                src="${filePath}" 
                alt="${Utils.escapeHtml(fileName)}" 
                onload="ContentRenderer_onImageLoaded('${imageId}')"
                onerror="ContentRenderer_onImageError('${imageId}')"
                style="max-width: 100%; height: auto; display: block; margin: 16px auto;" 
            />
            <div class="image-info">
                <span class="image-name">${Utils.escapeHtml(fileName)}</span>
                <span class="image-status" id="${imageId}-status">Loading...</span>
            </div>
        </div>`;
    },
    
    /**
     * Handle image load success - FIXED
     */
    onImageLoaded: function(imageId) {
        const statusElement = document.getElementById(`${imageId}-status`);
        if (statusElement) {
            statusElement.textContent = 'Loaded ✅';
            statusElement.style.color = '#10b981';
        }
        
        DEBUG.info(`Image loaded successfully: ${imageId}`);
        this.handleImageLoaded();
    },
    
    /**
     * Handle image load error - FIXED
     */
    onImageError: function(imageId) {
        const statusElement = document.getElementById(`${imageId}-status`);
        if (statusElement) {
            statusElement.textContent = 'Failed ❌';
            statusElement.style.color = '#ef4444';
        }
        
        DEBUG.warn(`Image failed to load: ${imageId}`);
        this.handleImageLoaded(); // Continue anyway
    },
    
    /**
     * Handle image loaded event - NEW FIXED METHOD
     */
    handleImageLoaded: function() {
        this.state.imageLoadCount++;
        DEBUG.info(`Image loaded: ${this.state.imageLoadCount}/${this.state.totalImages}`);
        
        if (this.state.imageLoadCount >= this.state.totalImages) {
            this.state.imagesLoaded = true;
            DEBUG.success('All images loaded');
            this.checkContentReadiness();
        }
    },
    
    /**
     * Apply post-rendering enhancements with PDF focus - ENHANCED
     */
    applyPostRenderingEnhancementsEnhanced: async function(contentArea, fileType) {
        try {
            // Apply syntax highlighting if needed
            if (fileType === 'code' || (fileType === 'data' && this.state.currentFile.endsWith('.json'))) {
                if (typeof MarkdownProcessor !== 'undefined') {
                    MarkdownProcessor.highlightCode(contentArea);
                    DEBUG.success('Enhanced code highlighting applied');
                }
            }
            
            // Apply math rendering for markdown with PDF preparation
            if (fileType === 'markdown' && typeof MarkdownProcessor !== 'undefined') {
                await this.renderMathWithPDFPreparation(contentArea);
            }
            
            // Add enhanced content enhancements
            this.addContentEnhancementsEnhanced(contentArea);
            
            // Prepare images for PDF - FIXED
            await this.prepareImagesForPDF(contentArea);
            
        } catch (error) {
            DEBUG.reportError(error, 'Enhanced post-rendering enhancement failed');
        }
    },
    
    /**
     * Render math with PDF preparation - FIXED
     */
    renderMathWithPDFPreparation: async function(contentArea) {
        DEBUG.info('Rendering math with PDF preparation...');
        
        try {
            if (typeof MarkdownProcessor !== 'undefined') {
                await MarkdownProcessor.renderMath(contentArea);
                DEBUG.success('Math rendering completed');
                
                // Wait a bit more for MathJax to fully stabilize
                await Utils.sleep(1000);
                
                // Mark math as rendered
                this.state.mathRendered = true;
                this.checkContentReadiness();
            } else {
                // No MathJax available
                this.state.mathRendered = true;
                this.checkContentReadiness();
            }
        } catch (error) {
            DEBUG.warn('Math rendering failed:', error);
            this.state.mathRendered = true; // Continue anyway
            this.checkContentReadiness();
        }
    },
    
    /**
     * Prepare images for PDF generation - FIXED
     */
    prepareImagesForPDF: async function(contentArea) {
        const images = contentArea.querySelectorAll('img');
        this.state.totalImages = images.length;
        this.state.imageLoadCount = 0;
        
        DEBUG.info(`Preparing ${images.length} images for PDF...`);
        
        if (images.length === 0) {
            this.state.imagesLoaded = true;
            this.checkContentReadiness();
            return;
        }
        
        // Count already loaded images
        let alreadyLoaded = 0;
        images.forEach(img => {
            if (img.complete && img.naturalHeight !== 0) {
                alreadyLoaded++;
            }
        });
        
        this.state.imageLoadCount = alreadyLoaded;
        DEBUG.info(`${alreadyLoaded} images already loaded`);
        
        if (this.state.imageLoadCount >= this.state.totalImages) {
            this.state.imagesLoaded = true;
            this.checkContentReadiness();
            return;
        }
        
        // Set up timeout for remaining images
        setTimeout(() => {
            if (!this.state.imagesLoaded) {
                DEBUG.warn('Image loading timeout - continuing anyway');
                this.state.imagesLoaded = true;
                this.checkContentReadiness();
            }
        }, this.config.timeouts.imageLoad);
    },
    
    /**
     * Add enhanced content enhancements - ENHANCED
     */
    addContentEnhancementsEnhanced: function(contentArea) {
        // Add copy buttons to code blocks with PDF-friendly styling
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
                        DEBUG.reportError(error, 'Failed to copy code');
                        button.innerHTML = '❌';
                        setTimeout(() => button.innerHTML = '📋', 2000);
                    }
                });
                
                pre.style.position = 'relative';
                pre.appendChild(button);
            }
        });
        
        // Make tables responsive and PDF-friendly
        const tables = contentArea.querySelectorAll('table:not(.wrapped)');
        tables.forEach(table => {
            if (!table.parentElement.classList.contains('table-container')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'table-container';
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
            table.classList.add('wrapped');
            
            // Add PDF-friendly table styling
            table.style.pageBreakInside = 'auto';
            table.style.borderCollapse = 'collapse';
        });
        
        // Add heading anchors with PDF compatibility
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
            
            // Add PDF-friendly heading styling
            heading.style.pageBreakAfter = 'avoid';
        });
        
        DEBUG.success('Enhanced content enhancements applied');
    },
    
    /**
     * Start monitoring content readiness - FIXED
     */
    startContentReadinessMonitoring: function() {
        DEBUG.info('Starting content readiness monitoring...');
        
        // Initial check
        setTimeout(() => {
            this.checkContentReadiness();
        }, 500);
        
        // Periodic checks with cleanup
        let checkCount = 0;
        const maxChecks = 15; // 15 seconds max
        
        const checkInterval = setInterval(() => {
            checkCount++;
            
            if (this.state.contentReady || checkCount >= maxChecks) {
                clearInterval(checkInterval);
                
                if (!this.state.contentReady && checkCount >= maxChecks) {
                    DEBUG.warn('Content readiness timeout - enabling PDF anyway');
                    this.markContentReady(true);
                }
                return;
            }
            
            this.checkContentReadiness();
        }, 1000);
    },
    
    /**
     * Check if all content is ready for PDF generation - FIXED
     */
    checkContentReadiness: function() {
        const contentArea = document.querySelector('#main-content');
        if (!contentArea) return;
        
        // Check images
        const imagesReady = this.state.imagesLoaded;
        
        // Check MathJax - FIXED: Better detection
        let mathReady = this.state.mathRendered;
        
        if (!mathReady) {
            const mathElements = contentArea.querySelectorAll('.MathJax, mjx-container, [class*="math"]');
            mathReady = mathElements.length === 0 || 
                       (window.MathJax && window.MathJax.startup && window.MathJax.startup.document && window.MathJax.startup.document.state() >= 8);
        }
        
        // Overall readiness
        const isReady = imagesReady && mathReady;
        
        DEBUG.info(`Content readiness check: images=${imagesReady} (${this.state.imageLoadCount}/${this.state.totalImages}), math=${mathReady}, overall=${isReady}`);
        
        if (isReady && !this.state.contentReady) {
            this.markContentReady(false);
        }
    },
    
    /**
     * Mark content as ready for PDF generation - FIXED
     */
    markContentReady: function(timeout = false) {
        this.state.contentReady = true;
        
        const indicator = document.getElementById('pdf-readiness-indicator');
        const dot = document.getElementById('pdf-ready-dot');
        const pdfBtn = document.getElementById('pdf-generate-btn');
        const pdfOptionsBtn = document.getElementById('pdf-options-btn');
        
        if (indicator) {
            const currentLang = UI.getCurrentLanguage();
            const text = indicator.querySelector('.indicator-text');
            
            if (timeout) {
                dot.textContent = '⚠️';
                dot.style.color = '#f59e0b';
                text.textContent = currentLang === 'fi' ? 'PDF valmis (aikakatkaisu)' : 'PDF ready (timeout)';
                indicator.style.background = 'rgba(245, 158, 11, 0.1)';
            } else {
                dot.textContent = '✅';
                dot.style.color = '#10b981';
                text.textContent = currentLang === 'fi' ? 'PDF valmis!' : 'PDF ready!';
                indicator.style.background = 'rgba(16, 185, 129, 0.1)';
            }
        }
        
        // Enable PDF buttons
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.style.opacity = '1';
            pdfBtn.style.cursor = 'pointer';
        }
        if (pdfOptionsBtn) {
            pdfOptionsBtn.disabled = false;
            pdfOptionsBtn.style.opacity = '1';
            pdfOptionsBtn.style.cursor = 'pointer';
        }
        
        DEBUG.success(`Content marked as ready for PDF generation (timeout: ${timeout})`);
    },
    
    /**
     * Reset content readiness state - FIXED
     */
    resetContentReadiness: function() {
        this.state.contentReady = false;
        this.state.imagesLoaded = false;
        this.state.mathRendered = false;
        this.state.imageLoadCount = 0;
        this.state.totalImages = 0;
    },
    
    /**
     * Generate PDF safely (only when content is ready) - FIXED
     */
    generatePDFSafely: async function() {
        DEBUG.info('Safe PDF generation requested...');
        
        if (!this.state.contentReady) {
            const currentLang = UI.getCurrentLanguage();
            const message = currentLang === 'fi' ? 
                'Sisältö ei ole vielä valmis PDF-generointiin. Odota hetki.' :
                'Content is not yet ready for PDF generation. Please wait a moment.';
            
            if (UI && UI.showNotification) {
                UI.showNotification(message, 'warning', 3000);
            }
            
            // Force readiness check
            this.checkContentReadiness();
            return;
        }
        
        try {
            if (typeof PDFGenerator !== 'undefined') {
                await PDFGenerator.generateAdvancedPDF();
            } else {
                throw new Error('PDFGenerator not available');
            }
        } catch (error) {
            DEBUG.reportError(error, 'Safe PDF generation failed');
            if (UI && UI.showNotification) {
                UI.showNotification('PDF generation failed', 'error');
            }
        }
    },
    
    /**
     * Generate PDF with options (safe version) - FIXED
     */
    generatePDFWithOptions: async function() {
        DEBUG.info('Safe PDF generation with options requested...');
        
        if (!this.state.contentReady) {
            const currentLang = UI.getCurrentLanguage();
            const message = currentLang === 'fi' ? 
                'Sisältö ei ole vielä valmis PDF-generointiin. Odota hetki.' :
                'Content is not yet ready for PDF generation. Please wait a moment.';
            
            if (UI && UI.showNotification) {
                UI.showNotification(message, 'warning', 3000);
            }
            return;
        }
        
        try {
            if (typeof PDFGenerator !== 'undefined') {
                await PDFGenerator.generatePDFWithOptions();
            } else {
                throw new Error('PDFGenerator not available');
            }
        } catch (error) {
            DEBUG.reportError(error, 'Safe PDF generation with options failed');
            if (UI && UI.showNotification) {
                UI.showNotification('PDF generation failed', 'error');
            }
        }
    },
    
    /**
     * Add PDF readiness indicator styles - FIXED
     */
    addPDFReadinessStyles: function() {
        if (document.getElementById('pdf-readiness-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'pdf-readiness-styles';
        styles.textContent = `
            .pdf-readiness-indicator {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.5rem 1rem;
                border-radius: 6px;
                background: rgba(107, 114, 128, 0.1);
                border: 1px solid rgba(107, 114, 128, 0.2);
                font-size: 0.875rem;
                transition: all 0.3s ease;
                min-width: 180px;
            }
            
            .indicator-dot {
                font-size: 1rem;
                transition: all 0.3s ease;
                min-width: 20px;
            }
            
            .indicator-text {
                font-weight: 500;
                color: #374151;
                white-space: nowrap;
            }
            
            .pdf-btn:disabled,
            .pdf-options-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
                pointer-events: none !important;
            }
            
            .pdf-btn:not(:disabled),
            .pdf-options-btn:not(:disabled) {
                opacity: 1 !important;
                cursor: pointer !important;
                pointer-events: auto !important;
            }
            
            .image-content-enhanced {
                text-align: center;
                margin: 2rem 0;
            }
            
            .image-info {
                margin-top: 1rem;
                padding: 0.5rem;
                background: rgba(243, 244, 246, 0.5);
                border-radius: 6px;
                font-size: 0.875rem;
            }
            
            .image-name {
                font-weight: 600;
                margin-right: 1rem;
            }
            
            .image-status {
                color: #6b7280;
            }
            
            @media (max-width: 768px) {
                .pdf-readiness-indicator {
                    min-width: auto;
                    flex-wrap: wrap;
                }
                
                .indicator-text {
                    white-space: normal;
                    font-size: 0.8rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    },
    
    /**
     * Legacy PDF generation methods (for backward compatibility)
     */
    generatePDF: async function() {
        await this.generatePDFSafely();
    },
    
    /**
     * Render markdown content (legacy method)
     */
    renderMarkdownContent: async function(content) {
        return await this.renderMarkdownContentEnhanced(content);
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
                DEBUG.warn('JSON parsing failed, showing as text');
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
            DEBUG.reportError(error, 'CSV parsing failed');
            return `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
    },
    
    /**
     * Detect programming language from filename
     */
    detectCodeLanguage: function(fileName) {
        const extension = Utils.getFileExtension(fileName);
        return this.config.supportedLanguages[extension] || 'text';
    },
    
    /**
     * Download file (trigger browser download) - FIXED
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
            DEBUG.success(`✅ File download completed: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to download file: ${filePath}`);
            UI.showNotification('Failed to download file', 'error');
        }
    },
    
    /**
     * Wait for content to be ready for PDF generation - FIXED
     */
    waitForContentReadiness: async function() {
        DEBUG.info('Waiting for content to be ready for PDF...');
        
        let attempts = 0;
        const maxAttempts = 15; // 15 seconds max wait
        
        while (!this.state.contentReady && attempts < maxAttempts) {
            await Utils.sleep(1000);
            this.checkContentReadiness();
            attempts++;
        }
        
        if (!this.state.contentReady) {
            DEBUG.warn('Content readiness timeout - marking as ready anyway');
            this.markContentReady(true);
        }
        
        DEBUG.success('Content readiness wait completed');
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
        this.resetContentReadiness();
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
    },
    
    /**
     * Get content readiness status - FIXED
     */
    getContentReadiness: function() {
        return {
            contentReady: this.state.contentReady,
            imagesLoaded: this.state.imagesLoaded,
            mathRendered: this.state.mathRendered,
            imageLoadCount: this.state.imageLoadCount,
            totalImages: this.state.totalImages
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.success('Enhanced ContentRenderer (Bug Fixed) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentRenderer;
}
