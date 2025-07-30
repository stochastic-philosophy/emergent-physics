/**
 * Content Renderer - Sisällön renderöinti ja esittäminen
 * Handles file viewing, content rendering, file downloads, and PDF generation
 * FIXED VERSION - Debug for empty PDF issue
 */

window.ContentRenderer = {
    
    // State specific to content rendering
    state: {
        currentFile: null,
        renderingOptions: {},
        viewHistory: []
    },
    
    // PDF Generation state
    pdfState: {
        html2pdfLoaded: false,
        html2canvasLoaded: false,
        jsPDFLoaded: false,
        generatingPDF: false
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
                    <button onclick="ContentRenderer.generateAdvancedPDF()" class="pdf-btn" title="Generate PDF with LaTeX and code highlighting">
                        ${currentLang === 'fi' ? '📄 PDF' : '📄 PDF'}
                    </button>
                    <button onclick="ContentRenderer.generatePDFWithOptions()" class="pdf-options-btn" title="PDF with options">
                        ${currentLang === 'fi' ? '⚙️ PDF Asetukset' : '⚙️ PDF Options'}
                    </button>
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
                html += '<div id="main-data-content">';
                html += await this.renderDataContent(content, fileName);
                html += '</div>';
                break;
                
            case 'images':
                html += '<div id="main-image-content">';
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
    
    // ================== PDF GENERATION METHODS (FIXED) ==================
    
    /**
     * Generate PDF with full visual fidelity (LaTeX + Code highlighting) - FIXED VERSION
     */
    generateAdvancedPDF: async function(options = {}) {
        DEBUG.info('=== GENERATING ADVANCED PDF (FIXED VERSION) ===');
        
        if (this.pdfState.generatingPDF) {
            DEBUG.warn('PDF generation already in progress');
            return;
        }
        
        this.pdfState.generatingPDF = true;
        
        try {
            // Show progress
            this.showPDFProgress('Initializing PDF generation...', 0);
            
            const currentFile = this.state.currentFile;
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            DEBUG.info(`PDF generation for file: ${fileName}`);
            
            // Update progress
            this.updatePDFProgress(10, 'Preparing content...');
            
            // DEBUG: Check what content is available
            const contentElement = this.findContentForPDF();
            if (!contentElement) {
                throw new Error('No content found for PDF generation');
            }
            
            DEBUG.info(`Content element found: ${contentElement.tagName}, class: ${contentElement.className}`);
            DEBUG.info(`Content length: ${contentElement.innerHTML.length} characters`);
            
            // Configure PDF options
            const pdfOptions = {
                margin: options.margin || [10, 10, 10, 10],
                filename: `${Utils.getFilenameWithoutExtension(fileName)}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: true,  // Enable logging for debug
                    width: contentElement.scrollWidth,
                    height: contentElement.scrollHeight
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: options.orientation || 'portrait',
                    compress: true
                },
                pagebreak: { 
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break-before',
                    after: '.page-break-after',
                    avoid: ['img', '.math-display', 'pre', 'table']
                }
            };
            
            this.updatePDFProgress(20, 'Loading PDF libraries...');
            
            // Try html2pdf.js first (best quality)
            try {
                this.updatePDFProgress(30, 'Generating PDF with html2pdf.js...');
                await this.generatePDFWithHtml2PDF_Fixed(contentElement, pdfOptions);
                this.updatePDFProgress(100, 'PDF completed!');
                DEBUG.success('PDF generated with html2pdf.js');
            } catch (html2pdfError) {
                DEBUG.warn('html2pdf.js failed, trying fallback method:', html2pdfError);
                this.updatePDFProgress(40, 'Trying alternative method...');
                await this.generatePDFWithFallback_Fixed(contentElement, pdfOptions);
                this.updatePDFProgress(100, 'PDF completed!');
                DEBUG.success('PDF generated with fallback method');
            }
            
            // Hide progress after a brief delay
            setTimeout(() => {
                this.hidePDFProgress();
            }, 1500);
            
            if (UI.showNotification) {
                UI.showNotification('PDF downloaded successfully', 'success');
            }
            
        } catch (error) {
            this.hidePDFProgress();
            DEBUG.reportError(error, 'Advanced PDF generation failed');
            if (UI.showNotification) {
                UI.showNotification(`PDF generation failed: ${error.message}`, 'error');
            }
            throw error;
        } finally {
            this.pdfState.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
    },
    
    /**
     * Find content element for PDF - FIXED VERSION
     */
    findContentForPDF: function() {
        // Try different selectors in priority order
        const selectors = [
            '#main-markdown-content',
            '#main-code-content', 
            '#main-data-content',
            '#main-image-content',
            '#main-text-content',
            '.markdown-content',
            '.file-content',
            '.code-content',
            '.data-content',
            '.text-content',
            '#main-content .file-content',
            '#main-content'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.innerHTML.trim().length > 0) {
                DEBUG.info(`Found content using selector: ${selector}`);
                DEBUG.info(`Content preview: ${element.innerHTML.substring(0, 200)}...`);
                return element;
            }
        }
        
        DEBUG.error('No content element found for PDF generation');
        DEBUG.info('Available elements:');
        selectors.forEach(selector => {
            const el = document.querySelector(selector);
            DEBUG.info(`${selector}: ${el ? 'exists' : 'not found'} ${el ? `(${el.innerHTML.length} chars)` : ''}`);
        });
        
        return null;
    },
    
    /**
     * Generate PDF using html2pdf.js - FIXED VERSION
     */
    generatePDFWithHtml2PDF_Fixed: async function(contentElement, options) {
        DEBUG.info('Generating PDF with html2pdf.js (FIXED)...');
        
        // Load html2pdf.js if needed
        await this.loadHtml2PDF();
        
        // Prepare content element for PDF
        const preparedElement = await this.prepareContentForPDF_Fixed(contentElement);
        
        DEBUG.info(`Prepared element HTML length: ${preparedElement.innerHTML.length}`);
        DEBUG.info(`Prepared element dimensions: ${preparedElement.scrollWidth}x${preparedElement.scrollHeight}`);
        
        // Configure html2pdf options
        const html2pdfOptions = {
            margin: options.margin,
            filename: options.filename,
            image: options.image,
            html2canvas: options.html2canvas,
            jsPDF: options.jsPDF,
            pagebreak: options.pagebreak
        };
        
        DEBUG.info('Starting html2pdf generation...');
        
        // Generate and download PDF
        await window.html2pdf()
            .set(html2pdfOptions)
            .from(preparedElement)
            .save();
        
        DEBUG.success('html2pdf.js generation completed successfully');
    },
    
    /**
     * Fallback: Generate PDF using html2canvas + jsPDF - FIXED VERSION
     */
    generatePDFWithFallback_Fixed: async function(contentElement, options) {
        DEBUG.info('Generating PDF with fallback method (html2canvas + jsPDF) - FIXED...');
        
        // Load required libraries
        await Promise.all([
            this.loadHtml2Canvas(),
            this.loadJsPDF()
        ]);
        
        const preparedElement = await this.prepareContentForPDF_Fixed(contentElement);
        
        DEBUG.info('Starting html2canvas rendering...');
        
        // Generate canvas from HTML
        const canvas = await window.html2canvas(preparedElement, {
            ...options.html2canvas,
            logging: true,
            onrendered: function(canvas) {
                DEBUG.info(`Canvas rendered: ${canvas.width}x${canvas.height}`);
            }
        });
        
        DEBUG.info(`Canvas created: ${canvas.width}x${canvas.height}`);
        
        if (canvas.width === 0 || canvas.height === 0) {
            throw new Error('Generated canvas is empty (0x0 dimensions)');
        }
        
        // Convert canvas to PDF
        const { jsPDF } = window.jsPDF;
        const pdf = new jsPDF(options.jsPDF);
        
        const imgData = canvas.toDataURL('image/jpeg', options.image.quality);
        const imgWidth = 210; // A4 width in mm
        const pageHeight = 295; // A4 height in mm  
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;
        
        DEBUG.info(`Adding image to PDF: ${imgWidth}x${imgHeight}mm`);
        
        // Add image to PDF with page breaks
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Download PDF
        pdf.save(options.filename);
        
        DEBUG.success('Fallback PDF generation completed successfully');
    },
    
    /**
     * Prepare content for PDF generation - FIXED VERSION
     */
    prepareContentForPDF_Fixed: async function(contentElement) {
        DEBUG.info('Preparing content for PDF (FIXED)...');
        
        if (!contentElement) {
            throw new Error('Content element is null or undefined');
        }
        
        // Clone content to avoid modifying original
        const clonedContent = contentElement.cloneNode(true);
        DEBUG.info(`Cloned content length: ${clonedContent.innerHTML.length}`);
        
        // Remove elements that shouldn't be in PDF
        const elementsToRemove = [
            '.file-navigation', '.project-navigation', '.back-to-home-btn',
            '.copy-code-btn', '.file-actions', 'script', 'button[onclick]',
            '.pdf-btn', '.pdf-options-btn', '.download-file-btn'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = clonedContent.querySelectorAll(selector);
            DEBUG.info(`Removing ${elements.length} elements with selector: ${selector}`);
            elements.forEach(el => el.remove());
        });
        
        // Ensure MathJax has finished rendering
        if (window.MathJax && window.MathJax.typesetPromise) {
            DEBUG.info('Waiting for MathJax to finish rendering...');
            try {
                await window.MathJax.typesetPromise([clonedContent]);
                DEBUG.success('MathJax rendering completed');
            } catch (mathError) {
                DEBUG.warn('MathJax rendering failed:', mathError);
            }
        }
        
        // Add PDF-specific styles
        this.addPDFStyles_Fixed(clonedContent);
        
        // Create temporary container for PDF generation
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-temp-container';
        tempContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 794px !important;
            min-height: 1000px !important;
            background: white !important;
            font-family: 'Segoe UI', sans-serif !important;
            line-height: 1.6 !important;
            color: #000 !important;
            padding: 20px !important;
            overflow: visible !important;
            z-index: -9999 !important;
            opacity: 0.01 !important;
        `;
        
        // Add title to PDF
        const fileName = this.state.currentFile ? this.state.currentFile.split('/').pop() : 'document';
        const title = document.createElement('h1');
        title.textContent = Utils.filenameToDisplayName(fileName);
        title.style.cssText = 'margin-bottom: 20px !important; color: #000 !important; font-size: 24px !important;';
        
        tempContainer.appendChild(title);
        tempContainer.appendChild(clonedContent);
        document.body.appendChild(tempContainer);
        
        // Wait for rendering to complete
        await Utils.sleep(1000);
        
        DEBUG.info(`Prepared container dimensions: ${tempContainer.scrollWidth}x${tempContainer.scrollHeight}`);
        DEBUG.success('Content prepared for PDF (FIXED)');
        
        return tempContainer;
    },
    
    /**
     * Add PDF-specific styles to content - FIXED VERSION
     */
    addPDFStyles_Fixed: function(contentElement) {
        const pdfStyles = document.createElement('style');
        pdfStyles.textContent = `
            /* PDF-specific styles - FIXED */
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-sizing: border-box !important;
            }
            
            /* Ensure all content is visible */
            body, div, p, h1, h2, h3, h4, h5, h6, pre, code, table, tr, td, th {
                color: #000 !important;
                background: transparent !important;
            }
            
            /* Ensure code blocks are readable */
            pre, code {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                padding: 8px !important;
                border-radius: 4px !important;
                font-family: 'Courier New', monospace !important;
                white-space: pre-wrap !important;
                word-wrap: break-word !important;
                color: #000 !important;
            }
            
            /* Preserve syntax highlighting colors */
            .token.comment { color: #6a9955 !important; }
            .token.keyword { color: #0000ff !important; }
            .token.string { color: #a31515 !important; }
            .token.number { color: #098658 !important; }
            .token.function { color: #795e26 !important; }
            .token.operator { color: #000000 !important; }
            
            /* Math display styling */
            .math-display, .MathJax_Display {
                margin: 16px 0 !important;
                text-align: center !important;
                page-break-inside: avoid !important;
                color: #000 !important;
            }
            
            /* Table styling */
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 16px 0 !important;
                page-break-inside: avoid !important;
            }
            
            th, td {
                border: 1px solid #ddd !important;
                padding: 8px !important;
                text-align: left !important;
                color: #000 !important;
            }
            
            th {
                background: #f0f0f0 !important;
                font-weight: bold !important;
            }
            
            /* Heading styles */
            h1, h2, h3, h4, h5, h6 {
                color: #000 !important;
                margin-top: 24px !important;
                margin-bottom: 12px !important;
                page-break-after: avoid !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            
            /* Paragraph spacing */
            p {
                margin-bottom: 12px !important;
                line-height: 1.6 !important;
                color: #000 !important;
            }
            
            /* Lists */
            ul, ol {
                margin: 12px 0 !important;
                padding-left: 24px !important;
            }
            
            li {
                margin-bottom: 6px !important;
                color: #000 !important;
            }
            
            /* Blockquotes */
            blockquote {
                border-left: 4px solid #ccc !important;
                margin: 16px 0 !important;
                padding-left: 16px !important;
                font-style: italic !important;
                color: #666 !important;
            }
            
            /* Images */
            img {
                max-width: 700px !important;
                height: auto !important;
                page-break-inside: avoid !important;
                margin: 16px 0 !important;
                display: block !important;
            }
            
            /* Ensure visibility */
            .markdown-content, .code-content, .text-content, .json-content {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000 !important;
            }
        `;
        
        document.head.appendChild(pdfStyles);
        contentElement.insertBefore(pdfStyles.cloneNode(true), contentElement.firstChild);
    },
    
    /**
     * Show PDF progress indicator
     */
    showPDFProgress: function(message = 'Generating PDF...', progress = 0) {
        // Remove existing progress indicator
        this.hidePDFProgress();
        
        const currentLang = UI.getCurrentLanguage();
        const progressContainer = document.createElement('div');
        progressContainer.id = 'pdf-progress-container';
        progressContainer.className = 'pdf-progress';
        progressContainer.innerHTML = `
            <div class="pdf-progress-content">
                <h3>${message}</h3>
                <div class="pdf-progress-bar">
                    <div class="pdf-progress-fill" style="width: ${progress}%"></div>
                </div>
                <p id="pdf-progress-text">${progress}%</p>
                <small>${currentLang === 'fi' ? 'Tämä voi kestää hetken...' : 'This may take a moment...'}</small>
            </div>
        `;
        
        document.body.appendChild(progressContainer);
    },
    
    /**
     * Hide PDF progress indicator
     */
    hidePDFProgress: function() {
        const progressContainer = document.getElementById('pdf-progress-container');
        if (progressContainer) {
            document.body.removeChild(progressContainer);
        }
    },
    
    /**
     * Update PDF progress
     */
    updatePDFProgress: function(progress, message = null) {
        const fillElement = document.querySelector('.pdf-progress-fill');
        const textElement = document.getElementById('pdf-progress-text');
        
        if (fillElement) {
            fillElement.style.width = `${progress}%`;
        }
        
        if (textElement) {
            textElement.textContent = `${progress}%`;
        }
        
        if (message) {
            const contentElement = document.querySelector('.pdf-progress-content h3');
            if (contentElement) {
                contentElement.textContent = message;
            }
        }
    },
    
    /**
     * Load html2pdf.js library
     */
    loadHtml2PDF: async function() {
        if (this.pdfState.html2pdfLoaded || typeof window.html2pdf !== 'undefined') {
            this.pdfState.html2pdfLoaded = true;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            script.onload = () => {
                this.pdfState.html2pdfLoaded = true;
                DEBUG.success('html2pdf.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load html2pdf.js');
                reject(new Error('Failed to load html2pdf.js'));
            };
            document.head.appendChild(script);
        });
    },
    
    /**
     * Load html2canvas library (fallback)
     */
    loadHtml2Canvas: async function() {
        if (this.pdfState.html2canvasLoaded || typeof window.html2canvas !== 'undefined') {
            this.pdfState.html2canvasLoaded = true;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => {
                this.pdfState.html2canvasLoaded = true;
                DEBUG.success('html2canvas loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load html2canvas');
                reject(new Error('Failed to load html2canvas'));
            };
            document.head.appendChild(script);
        });
    },
    
    /**
     * Load jsPDF library (fallback)
     */
    loadJsPDF: async function() {
        if (this.pdfState.jsPDFLoaded || typeof window.jsPDF !== 'undefined') {
            this.pdfState.jsPDFLoaded = true;
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                this.pdfState.jsPDFLoaded = true;
                DEBUG.success('jsPDF loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load jsPDF');
                reject(new Error('Failed to load jsPDF'));
            };
            document.head.appendChild(script);
        });
    },
    
    /**
     * Clean up temporary PDF elements
     */
    cleanupPDFGeneration: function() {
        const tempContainer = document.getElementById('pdf-temp-container');
        if (tempContainer) {
            document.body.removeChild(tempContainer);
            DEBUG.info('PDF temp container cleaned up');
        }
    },
    
    /**
     * Generate PDF with user options dialog
     */
    generatePDFWithOptions: async function() {
        const currentLang = UI.getCurrentLanguage();
        
        // Simple options for now - could be enhanced with a modal dialog
        const orientation = confirm(currentLang === 'fi' ? 
            'Käytä pystysuuntaa? (Peruuta = vaakasuunta)' : 
            'Use portrait orientation? (Cancel = landscape)') ? 'portrait' : 'landscape';
        
        const options = {
            orientation: orientation,
            margin: orientation === 'portrait' ? [10, 10, 10, 10] : [8, 8, 8, 8]
        };
        
        await this.generateAdvancedPDF(options);
    },
    
    // ================== END PDF GENERATION METHODS ==================
    
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
