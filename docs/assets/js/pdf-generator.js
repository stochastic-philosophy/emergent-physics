/**
 * PDF Generator - Content Visibility Fixed
 * FIXED: Ensures content is ACTUALLY VISIBLE for PDF generation
 * The main issue was temp container positioning and CSS hiding content
 */

window.PDFGenerator = {
    
    // PDF Generation state
    state: {
        generatingPDF: false,
        currentTempContainer: null,
        actualTempContainer: null
    },
    
    // Configuration
    config: {
        defaultOptions: {
            margin: [10, 10, 10, 10],
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: true, // ENABLE logging to debug
                foreignObjectRendering: true,
                imageTimeout: 15000,
                removeContainer: false,
                width: 800,
                height: 1200
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: true
            },
            pagebreak: { 
                mode: ['avoid-all', 'css', 'legacy'],
                before: '.page-break-before',
                after: '.page-break-after',
                avoid: ['img', '.math-display', 'pre', 'table']
            }
        },
        contentSelectors: [
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
        ],
        timeouts: {
            imageLoad: 10000,
            mathRender: 8000,
            finalRender: 3000,
            libraryLoad: 15000
        }
    },
    
    /**
     * Generate PDF with full visual fidelity - MAIN ENTRY POINT
     */
    generateAdvancedPDF: async function(options = {}) {
        DEBUG.info('=== GENERATING PDF (VISIBILITY FIXED) ===');
        
        if (this.state.generatingPDF) {
            DEBUG.warn('PDF generation already in progress');
            return;
        }
        
        this.state.generatingPDF = true;
        
        try {
            // Show progress
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.showPDFProgress('Initializing PDF generation...', 0);
            }
            
            const currentFile = ContentRenderer ? ContentRenderer.getCurrentFile() : null;
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            DEBUG.info(`PDF generation for file: ${fileName}`);
            
            // Update progress
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(10, 'Preparing content...');
            }
            
            // Find and prepare content - ENHANCED LOGGING
            const contentElement = this.findContentForPDF();
            if (!contentElement) {
                throw new Error('No content found for PDF generation');
            }
            
            DEBUG.info(`Content element found: ${contentElement.tagName}, class: ${contentElement.className}`);
            DEBUG.info(`Content dimensions: ${contentElement.offsetWidth}x${contentElement.offsetHeight}`);
            DEBUG.info(`Content text length: ${contentElement.textContent.length} characters`);
            DEBUG.info(`Content HTML length: ${contentElement.innerHTML.length} characters`);
            
            // Configure PDF options
            const pdfOptions = this.buildPDFOptions(fileName, options);
            
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(20, 'Loading PDF libraries...');
            }
            
            // Try html2pdf.js first (best quality) - FIXED VERSION
            try {
                if (typeof PDFLibraryManager !== 'undefined') {
                    PDFLibraryManager.updatePDFProgress(30, 'Generating PDF with enhanced method...');
                }
                await this.generatePDFWithVisibleContent(contentElement, pdfOptions);
                if (typeof PDFLibraryManager !== 'undefined') {
                    PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                }
                DEBUG.success('PDF generated with enhanced method');
            } catch (html2pdfError) {
                DEBUG.warn('Enhanced method failed, trying debug fallback:', html2pdfError);
                if (typeof PDFLibraryManager !== 'undefined') {
                    PDFLibraryManager.updatePDFProgress(40, 'Trying debug method...');
                }
                await this.generatePDFWithDebugMethod(contentElement, pdfOptions);
                if (typeof PDFLibraryManager !== 'undefined') {
                    PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                }
                DEBUG.success('PDF generated with debug method');
            }
            
            // Hide progress after a brief delay
            if (typeof PDFLibraryManager !== 'undefined') {
                setTimeout(() => {
                    PDFLibraryManager.hidePDFProgress();
                }, 1500);
            }
            
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('PDF downloaded successfully', 'success');
            }
            
        } catch (error) {
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.hidePDFProgress();
                PDFLibraryManager.showPDFError(`PDF generation failed: ${error.message}`, error.stack);
            }
            DEBUG.reportError(error, 'Advanced PDF generation failed');
        } finally {
            this.state.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
    },
    
    /**
     * Generate PDF with VISIBLE content - CRITICAL FIX
     */
    generatePDFWithVisibleContent: async function(contentElement, options) {
        DEBUG.info('Generating PDF with VISIBLE content...');
        
        // Load html2pdf.js if needed
        if (typeof PDFLibraryManager !== 'undefined') {
            await PDFLibraryManager.loadHtml2PDF();
        } else {
            throw new Error('PDFLibraryManager not available');
        }
        
        // Create VISIBLE temp container - CRITICAL FIX
        const visibleContainer = await this.createActuallyVisibleContainer(contentElement);
        
        try {
            // CRITICAL: Wait for all content to be ready
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(40, 'Waiting for content...');
            }
            
            await this.waitForAllImages(visibleContainer);
            await this.waitForMathJax(visibleContainer);
            await Utils.sleep(this.config.timeouts.finalRender);
            
            // DEBUG: Log container state
            DEBUG.info(`VISIBLE container dimensions: ${visibleContainer.offsetWidth}x${visibleContainer.offsetHeight}`);
            DEBUG.info(`VISIBLE container scroll dimensions: ${visibleContainer.scrollWidth}x${visibleContainer.scrollHeight}`);
            DEBUG.info(`VISIBLE container text content: ${visibleContainer.textContent.substring(0, 200)}...`);
            DEBUG.info(`VISIBLE container computed style display: ${window.getComputedStyle(visibleContainer).display}`);
            DEBUG.info(`VISIBLE container computed style visibility: ${window.getComputedStyle(visibleContainer).visibility}`);
            DEBUG.info(`VISIBLE container computed style opacity: ${window.getComputedStyle(visibleContainer).opacity}`);
            
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(70, 'Final rendering...');
            }
            
            // Configure html2pdf options with ENHANCED settings
            const html2pdfOptions = {
                margin: options.margin,
                filename: options.filename,
                image: options.image,
                html2canvas: {
                    ...options.html2canvas,
                    width: Math.max(visibleContainer.scrollWidth, 800),
                    height: Math.max(visibleContainer.scrollHeight, 600),
                    onclone: function(clonedDoc) {
                        DEBUG.info('HTML2PDF: Document cloned');
                        const clonedContainer = clonedDoc.getElementById(visibleContainer.id);
                        if (clonedContainer) {
                            DEBUG.info(`HTML2PDF: Cloned container found - ${clonedContainer.offsetWidth}x${clonedContainer.offsetHeight}`);
                        } else {
                            DEBUG.warn('HTML2PDF: Cloned container not found!');
                        }
                    },
                    onrendered: function(canvas) {
                        DEBUG.info(`HTML2PDF: Canvas rendered - ${canvas.width}x${canvas.height}`);
                        if (canvas.width === 0 || canvas.height === 0) {
                            DEBUG.error('HTML2PDF: Canvas is empty!');
                        }
                    }
                },
                jsPDF: options.jsPDF,
                pagebreak: options.pagebreak
            };
            
            DEBUG.info('Starting html2pdf generation from VISIBLE container...');
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(80, 'Generating PDF...');
            }
            
            // Generate PDF from visible container
            if (typeof window.html2pdf === 'undefined') {
                throw new Error('html2pdf library not loaded');
            }
            
            await window.html2pdf()
                .set(html2pdfOptions)
                .from(visibleContainer)
                .toPdf()
                .save();
            
            DEBUG.success('PDF generated successfully with visible content');
            
        } finally {
            // Always cleanup the container
            this.cleanupContainer(visibleContainer);
        }
    },
    
    /**
     * Generate PDF with debug method - FALLBACK with extensive logging
     */
    generatePDFWithDebugMethod: async function(contentElement, options) {
        DEBUG.info('Generating PDF with DEBUG method...');
        
        // Load required libraries
        if (typeof PDFLibraryManager !== 'undefined') {
            await Promise.all([
                PDFLibraryManager.loadHtml2Canvas(),
                PDFLibraryManager.loadJsPDF()
            ]);
        } else {
            throw new Error('PDFLibraryManager not available');
        }
        
        // Create visible temp container
        const visibleContainer = await this.createActuallyVisibleContainer(contentElement);
        
        try {
            // Wait for content
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(50, 'Preparing content for debug...');
            }
            
            await this.waitForAllImages(visibleContainer);
            await this.waitForMathJax(visibleContainer);
            await Utils.sleep(2000);
            
            DEBUG.info('Starting html2canvas from DEBUG container...');
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(70, 'Creating debug canvas...');
            }
            
            // Check library availability
            if (typeof window.html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded');
            }
            
            // Generate canvas with DEBUG settings
            const canvas = await window.html2canvas(visibleContainer, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: true, // ENABLE logging
                foreignObjectRendering: true,
                imageTimeout: 15000,
                width: Math.max(visibleContainer.scrollWidth, 800),
                height: Math.max(visibleContainer.scrollHeight, 600),
                onclone: function(clonedDoc) {
                    DEBUG.info('HTML2CANVAS: Document cloned for debug');
                    // Force all elements to be visible in clone
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach(el => {
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                        el.style.display = el.style.display === 'none' ? 'block' : el.style.display;
                    });
                },
                onrendered: function(renderedCanvas) {
                    DEBUG.info(`HTML2CANVAS: Debug canvas created - ${renderedCanvas.width}x${renderedCanvas.height}`);
                }
            });
            
            DEBUG.info(`Debug canvas created: ${canvas.width}x${canvas.height}`);
            
            // CHECK: Is canvas actually empty?
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('Debug canvas is empty - container may be hidden');
            }
            
            // Create test image to verify canvas content
            const testImageData = canvas.getContext('2d').getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height));
            const hasNonWhitePixels = Array.from(testImageData.data).some((value, index) => {
                return index % 4 !== 3 && value !== 255; // Check RGB values (skip alpha)
            });
            
            if (!hasNonWhitePixels) {
                DEBUG.warn('Debug canvas appears to be all white - content may not be rendering');
            } else {
                DEBUG.success('Debug canvas contains visible content');
            }
            
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(85, 'Creating PDF from debug canvas...');
            }
            
            // Get jsPDF constructor
            let jsPDFConstructor;
            try {
                if (typeof PDFLibraryManager !== 'undefined' && PDFLibraryManager.getJsPDFConstructor) {
                    jsPDFConstructor = PDFLibraryManager.getJsPDFConstructor();
                } else {
                    throw new Error('Cannot get jsPDF constructor');
                }
            } catch (constructorError) {
                DEBUG.error('Failed to get jsPDF constructor:', constructorError);
                throw new Error(`jsPDF constructor not available: ${constructorError.message}`);
            }
            
            // Convert canvas to PDF
            const pdf = new jsPDFConstructor(options.jsPDF);
            
            const imgData = canvas.toDataURL('image/jpeg', options.image.quality);
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm  
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            let heightLeft = imgHeight;
            let position = 0;
            
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
            
            DEBUG.success('Debug PDF generation completed');
            
        } finally {
            // Always cleanup
            this.cleanupContainer(visibleContainer);
        }
    },
    
    /**
     * Create ACTUALLY VISIBLE temp container - MAJOR FIX
     */
    createActuallyVisibleContainer: async function(contentElement) {
        DEBUG.info('Creating ACTUALLY VISIBLE temp container...');
        
        // Clone content to avoid modifying original
        const clonedContent = contentElement.cloneNode(true);
        
        // Remove elements that shouldn't be in PDF
        const elementsToRemove = [
            '.file-navigation', '.project-navigation', '.back-to-home-btn',
            '.copy-code-btn', '.file-actions', 'script', 'button',
            '.pdf-btn', '.pdf-options-btn', '.download-file-btn',
            '.pdf-readiness-indicator'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = clonedContent.querySelectorAll(selector);
            elements.forEach(el => {
                if (el && el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        });
        
        // CRITICAL FIX: Create container that is ACTUALLY VISIBLE
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-visible-container-' + Date.now();
        
        // FIXED: Position container ON SCREEN but off the visible area
        // This ensures it's rendered by the browser but not seen by user
        tempContainer.style.cssText = `
            position: fixed !important;
            top: -5000px !important;
            left: 0 !important;
            width: 800px !important;
            min-height: 600px !important;
            max-width: 800px !important;
            background: white !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            color: #000000 !important;
            padding: 20px !important;
            box-sizing: border-box !important;
            z-index: 999999 !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            overflow: visible !important;
            pointer-events: none !important;
            border: 2px solid #ff0000 !important;
            transform: none !important;
        `;
        
        // Add title to PDF
        const fileName = ContentRenderer && ContentRenderer.getCurrentFile ? 
                         (ContentRenderer.getCurrentFile() || '').split('/').pop() : 
                         'document';
        if (fileName && fileName !== 'document') {
            const title = document.createElement('h1');
            title.textContent = Utils ? Utils.filenameToDisplayName(fileName) : fileName;
            title.style.cssText = `
                margin: 0 0 20px 0 !important; 
                color: #000000 !important; 
                font-size: 24px !important; 
                font-weight: bold !important;
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
            `;
            tempContainer.appendChild(title);
        }
        
        // Add FORCE VISIBLE styles - CRITICAL
        this.addForceVisibleStyles(clonedContent);
        
        tempContainer.appendChild(clonedContent);
        
        // Add directly to body (no wrapper)
        document.body.appendChild(tempContainer);
        
        // Store reference for cleanup
        this.state.currentTempContainer = tempContainer;
        this.state.actualTempContainer = tempContainer;
        
        // CRITICAL: Wait for layout and force reflow
        await Utils.sleep(1000);
        
        // Force a reflow to ensure content is rendered
        const height = tempContainer.offsetHeight;
        const width = tempContainer.offsetWidth;
        
        DEBUG.success(`VISIBLE temp container created: ${width}x${height}`);
        DEBUG.info(`Container text preview: ${tempContainer.textContent.substring(0, 100)}...`);
        
        // Verify container is not empty
        if (height < 50 || width < 50) {
            DEBUG.warn('Container seems very small - content may not be rendering');
        }
        
        if (!tempContainer.textContent.trim()) {
            DEBUG.error('Container has no text content!');
        }
        
        return tempContainer;
    },
    
    /**
     * Add FORCE VISIBLE styles - CRITICAL for PDF visibility
     */
    addForceVisibleStyles: function(contentElement) {
        const forceVisibleStyles = document.createElement('style');
        forceVisibleStyles.textContent = `
            /* FORCE EVERYTHING TO BE VISIBLE */
            *, *::before, *::after {
                visibility: visible !important;
                opacity: 1 !important;
                display: block !important;
                color: #000000 !important;
                background-color: transparent !important;
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            /* Specific element overrides */
            div, p, span, h1, h2, h3, h4, h5, h6, li, td, th, a {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000000 !important;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                line-height: 1.6 !important;
            }
            
            /* Inline elements that should stay inline */
            span, a, code, strong, em, b, i {
                display: inline !important;
            }
            
            /* Headings */
            h1, h2, h3, h4, h5, h6 {
                display: block !important;
                font-weight: bold !important;
                margin: 16px 0 8px 0 !important;
                color: #000000 !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            h4 { font-size: 16px !important; }
            h5 { font-size: 14px !important; }
            h6 { font-size: 12px !important; }
            
            /* Paragraphs and lists */
            p {
                display: block !important;
                margin: 12px 0 !important;
                color: #000000 !important;
            }
            
            ul, ol {
                display: block !important;
                margin: 16px 0 !important;
                padding-left: 20px !important;
            }
            
            li {
                display: list-item !important;
                margin: 4px 0 !important;
                color: #000000 !important;
            }
            
            /* Code blocks */
            pre {
                display: block !important;
                background: #f8f9fa !important;
                border: 1px solid #e9ecef !important;
                padding: 16px !important;
                margin: 16px 0 !important;
                border-radius: 4px !important;
                overflow: visible !important;
                white-space: pre-wrap !important;
                font-family: 'Courier New', Consolas, Monaco, monospace !important;
                font-size: 12px !important;
                color: #000000 !important;
            }
            
            code {
                font-family: 'Courier New', Consolas, Monaco, monospace !important;
                background: #f1f3f4 !important;
                padding: 2px 4px !important;
                border-radius: 3px !important;
                font-size: 12px !important;
                color: #000000 !important;
            }
            
            /* Tables */
            table {
                display: table !important;
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 16px 0 !important;
                border: 1px solid #dee2e6 !important;
            }
            
            th, td {
                display: table-cell !important;
                border: 1px solid #dee2e6 !important;
                padding: 8px 12px !important;
                text-align: left !important;
                color: #000000 !important;
                vertical-align: top !important;
            }
            
            th {
                background: #f8f9fa !important;
                font-weight: bold !important;
            }
            
            tr {
                display: table-row !important;
            }
            
            /* Images */
            img {
                display: block !important;
                max-width: 700px !important;
                height: auto !important;
                margin: 16px auto !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 4px !important;
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            /* Math elements */
            .MathJax, .MathJax_Display, mjx-container, .math-display {
                display: block !important;
                margin: 16px 0 !important;
                color: #000000 !important;
                opacity: 1 !important;
                visibility: visible !important;
                background: transparent !important;
            }
            
            mjx-container mjx-math {
                color: #000000 !important;
                filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
            
            /* Block quotes */
            blockquote {
                display: block !important;
                border-left: 4px solid #dee2e6 !important;
                padding-left: 16px !important;
                margin: 16px 0 !important;
                color: #6c757d !important;
                font-style: italic !important;
            }
            
            /* Links */
            a {
                color: #0366d6 !important;
                text-decoration: underline !important;
            }
            
            /* Horizontal rules */
            hr {
                display: block !important;
                border: none !important;
                border-top: 1px solid #dee2e6 !important;
                margin: 24px 0 !important;
            }
            
            /* FORCE SHOW HIDDEN ELEMENTS */
            [style*="display: none"], [style*="display:none"] {
                display: block !important;
            }
            
            [style*="visibility: hidden"], [style*="visibility:hidden"] {
                visibility: visible !important;
            }
            
            [style*="opacity: 0"], [style*="opacity:0"] {
                opacity: 1 !important;
            }
            
            /* Remove any transforms that might hide content */
            * {
                transform: none !important;
                filter: none !important;
                clip: none !important;
                clip-path: none !important;
            }
        `;
        
        contentElement.insertBefore(forceVisibleStyles, contentElement.firstChild);
        DEBUG.info('Force visible styles applied');
    },
    
    /**
     * Wait for all images to load
     */
    waitForAllImages: async function(container) {
        if (!container) return;
        
        const images = container.querySelectorAll('img');
        DEBUG.info(`Waiting for ${images.length} images to load...`);
        
        if (images.length === 0) {
            DEBUG.info('No images found');
            return;
        }
        
        const imagePromises = Array.from(images).map((img, index) => {
            return new Promise((resolve) => {
                if (img.complete && img.naturalHeight !== 0) {
                    DEBUG.info(`Image ${index + 1} already loaded: ${img.src}`);
                    resolve();
                } else {
                    const timeout = setTimeout(() => {
                        DEBUG.warn(`Image ${index + 1} load timeout: ${img.src}`);
                        resolve();
                    }, this.config.timeouts.imageLoad);
                    
                    img.onload = () => {
                        clearTimeout(timeout);
                        DEBUG.info(`Image ${index + 1} loaded successfully: ${img.src}`);
                        resolve();
                    };
                    
                    img.onerror = () => {
                        clearTimeout(timeout);
                        DEBUG.warn(`Image ${index + 1} failed to load: ${img.src}`);
                        resolve();
                    };
                    
                    if (!img.src && img.getAttribute('src')) {
                        img.src = img.getAttribute('src');
                    }
                }
            });
        });
        
        await Promise.all(imagePromises);
        DEBUG.success('All images processed');
    },
    
    /**
     * Wait for MathJax to finish rendering
     */
    waitForMathJax: async function(container) {
        DEBUG.info('Waiting for MathJax...');
        
        if (!container) return;
        
        if (!window.MathJax || !window.MathJax.typesetPromise) {
            DEBUG.info('MathJax not available');
            return;
        }
        
        const mathElements = container.querySelectorAll('[class*="math"], script[type*="math"], .MathJax, mjx-container');
        DEBUG.info(`Found ${mathElements.length} potential math elements`);
        
        try {
            await Promise.race([
                window.MathJax.typesetPromise([container]),
                new Promise((resolve) => {
                    setTimeout(() => {
                        DEBUG.warn('MathJax rendering timeout');
                        resolve();
                    }, this.config.timeouts.mathRender);
                })
            ]);
            
            DEBUG.success('MathJax rendering completed');
            await Utils.sleep(1000);
            
        } catch (error) {
            DEBUG.warn('MathJax rendering error:', error);
        }
    },
    
    /**
     * Build PDF options from defaults and user options
     */
    buildPDFOptions: function(fileName, userOptions = {}) {
        const defaultOptions = this.config.defaultOptions;
        
        return {
            margin: userOptions.margin || defaultOptions.margin,
            filename: `${Utils ? Utils.getFilenameWithoutExtension(fileName) : fileName.replace(/\.[^/.]+$/, '')}.pdf`,
            image: { ...defaultOptions.image, ...userOptions.image },
            html2canvas: { 
                ...defaultOptions.html2canvas,
                ...userOptions.html2canvas
            },
            jsPDF: { 
                ...defaultOptions.jsPDF,
                orientation: userOptions.orientation || defaultOptions.jsPDF.orientation
            },
            pagebreak: { ...defaultOptions.pagebreak, ...userOptions.pagebreak }
        };
    },
    
    /**
     * Find content element for PDF generation
     */
    findContentForPDF: function() {
        for (const selector of this.config.contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerHTML && element.innerHTML.trim().length > 0) {
                DEBUG.info(`Found content using selector: ${selector}`);
                return element;
            }
        }
        
        DEBUG.error('No content element found for PDF generation');
        return null;
    },
    
    /**
     * Generate PDF with user options dialog
     */
    generatePDFWithOptions: async function() {
        const currentLang = (typeof UI !== 'undefined' && UI.getCurrentLanguage) ? 
                           UI.getCurrentLanguage() : 'en';
        
        const orientation = confirm(currentLang === 'fi' ? 
            'Käytä pystysuuntaa? (Peruuta = vaakasuunta)' : 
            'Use portrait orientation? (Cancel = landscape)') ? 'portrait' : 'landscape';
        
        const options = {
            orientation: orientation,
            margin: orientation === 'portrait' ? [10, 10, 10, 10] : [8, 8, 8, 8]
        };
        
        await this.generateAdvancedPDF(options);
    },
    
    /**
     * Clean up specific container
     */
    cleanupContainer: function(container) {
        try {
            if (container && container.parentNode) {
                container.parentNode.removeChild(container);
                DEBUG.info('PDF container cleaned up successfully');
            }
        } catch (error) {
            DEBUG.warn('Error cleaning up PDF container:', error);
        }
    },
    
    /**
     * Clean up temporary PDF elements
     */
    cleanupPDFGeneration: function() {
        try {
            // Clean up main temp containers
            if (this.state.currentTempContainer) {
                this.cleanupContainer(this.state.currentTempContainer);
                this.state.currentTempContainer = null;
            }
            
            if (this.state.actualTempContainer) {
                this.cleanupContainer(this.state.actualTempContainer);
                this.state.actualTempContainer = null;
            }
            
            // Remove any leftover temp elements
            const tempContainers = document.querySelectorAll('[id*="pdf-visible-container"], [id*="pdf-temp-container"]');
            tempContainers.forEach(container => {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
            });
            
            DEBUG.info('PDF generation cleanup completed');
            
        } catch (error) {
            DEBUG.warn('Error during PDF cleanup:', error);
        }
    },
    
    /**
     * Check if PDF generation is in progress
     */
    isGenerating: function() {
        return this.state.generatingPDF;
    },
    
    /**
     * Get PDF generation status
     */
    getStatus: function() {
        return {
            generating: this.state.generatingPDF,
            hasTempContainer: !!(this.state.currentTempContainer || this.state.actualTempContainer),
            timeouts: this.config.timeouts,
            jsPDFAvailable: typeof PDFLibraryManager !== 'undefined' ? PDFLibraryManager.checkJsPDFAvailable() : false
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFGenerator (Content Visibility Fixed) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
