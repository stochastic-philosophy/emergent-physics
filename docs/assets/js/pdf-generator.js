/**
 * PDF Generator - Fixed Version with Image and Math Support
 * Handles PDF generation from content with full visual fidelity
 * FIXED: Images and mathematics now properly included in PDF
 */

window.PDFGenerator = {
    
    // PDF Generation state
    state: {
        generatingPDF: false,
        currentTempContainer: null
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
                logging: false,
                foreignObjectRendering: true,
                imageTimeout: 15000,
                removeContainer: false
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
        // FIXED: Longer timeouts for image and math loading
        timeouts: {
            imageLoad: 10000,        // 10 seconds for images
            mathRender: 8000,        // 8 seconds for MathJax
            finalRender: 3000        // 3 seconds final wait
        }
    },
    
    /**
     * Generate PDF with full visual fidelity - MAIN ENTRY POINT (FIXED)
     */
    generateAdvancedPDF: async function(options = {}) {
        DEBUG.info('=== GENERATING ADVANCED PDF (FIXED FOR IMAGES & MATH) ===');
        
        if (this.state.generatingPDF) {
            DEBUG.warn('PDF generation already in progress');
            return;
        }
        
        this.state.generatingPDF = true;
        
        try {
            // Show progress
            PDFLibraryManager.showPDFProgress('Initializing PDF generation...', 0);
            
            const currentFile = ContentRenderer.getCurrentFile();
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            DEBUG.info(`PDF generation for file: ${fileName}`);
            
            // Update progress
            PDFLibraryManager.updatePDFProgress(10, 'Preparing content...');
            
            // Find and prepare content
            const contentElement = this.findContentForPDF();
            if (!contentElement) {
                throw new Error('No content found for PDF generation');
            }
            
            DEBUG.info(`Content element found: ${contentElement.tagName}, class: ${contentElement.className}`);
            DEBUG.info(`Content length: ${contentElement.innerHTML.length} characters`);
            
            // Configure PDF options
            const pdfOptions = this.buildPDFOptions(fileName, options);
            
            PDFLibraryManager.updatePDFProgress(20, 'Loading PDF libraries...');
            
            // Try html2pdf.js first (best quality) - FIXED VERSION
            try {
                PDFLibraryManager.updatePDFProgress(30, 'Generating PDF with enhanced method...');
                await this.generatePDFWithProperRendering(contentElement, pdfOptions);
                PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                DEBUG.success('PDF generated with enhanced method');
            } catch (html2pdfError) {
                DEBUG.warn('Enhanced method failed, trying fallback:', html2pdfError);
                PDFLibraryManager.updatePDFProgress(40, 'Trying alternative method...');
                await this.generatePDFWithEnhancedFallback(contentElement, pdfOptions);
                PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                DEBUG.success('PDF generated with fallback method');
            }
            
            // Hide progress after a brief delay
            setTimeout(() => {
                PDFLibraryManager.hidePDFProgress();
            }, 1500);
            
            if (UI.showNotification) {
                UI.showNotification('PDF downloaded successfully', 'success');
            }
            
        } catch (error) {
            PDFLibraryManager.hidePDFProgress();
            DEBUG.reportError(error, 'Advanced PDF generation failed');
            PDFLibraryManager.showPDFError(`PDF generation failed: ${error.message}`, error.stack);
        } finally {
            this.state.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
    },
    
    /**
     * Generate PDF with proper image and math rendering - FIXED METHOD
     */
    generatePDFWithProperRendering: async function(contentElement, options) {
        DEBUG.info('Generating PDF with PROPER image and math rendering...');
        
        // Load html2pdf.js if needed
        await PDFLibraryManager.loadHtml2PDF();
        
        // Create properly positioned temp container - FIXED
        const properContainer = await this.createProperTempContainer(contentElement);
        
        try {
            // CRITICAL FIX: Wait for all images to load
            PDFLibraryManager.updatePDFProgress(40, 'Loading images...');
            await this.waitForAllImages(properContainer);
            
            // CRITICAL FIX: Wait for MathJax to finish rendering
            PDFLibraryManager.updatePDFProgress(60, 'Rendering mathematics...');
            await this.waitForMathJax(properContainer);
            
            // Additional wait for final rendering
            PDFLibraryManager.updatePDFProgress(70, 'Final rendering...');
            await Utils.sleep(this.config.timeouts.finalRender);
            
            DEBUG.info(`PROPER container final dimensions: ${properContainer.scrollWidth}x${properContainer.scrollHeight}`);
            
            // Configure html2pdf options with FIXED settings
            const html2pdfOptions = {
                margin: options.margin,
                filename: options.filename,
                image: options.image,
                html2canvas: {
                    ...options.html2canvas,
                    width: properContainer.scrollWidth,
                    height: properContainer.scrollHeight,
                    onrendered: function(canvas) {
                        DEBUG.info(`Canvas rendered: ${canvas.width}x${canvas.height}`);
                    }
                },
                jsPDF: options.jsPDF,
                pagebreak: options.pagebreak
            };
            
            DEBUG.info('Starting html2pdf generation from PROPER container...');
            PDFLibraryManager.updatePDFProgress(80, 'Generating PDF...');
            
            // Generate PDF from properly rendered container
            await window.html2pdf()
                .set(html2pdfOptions)
                .from(properContainer)
                .toPdf()
                .save();
            
            DEBUG.success('PDF generated successfully with proper rendering');
            
        } finally {
            // Always cleanup the container
            if (properContainer && properContainer.parentNode) {
                document.body.removeChild(properContainer);
                this.state.currentTempContainer = null;
                DEBUG.info('PROPER temp container removed');
            }
        }
    },
    
    /**
     * Generate PDF using enhanced fallback method - FIXED
     */
    generatePDFWithEnhancedFallback: async function(contentElement, options) {
        DEBUG.info('Generating PDF with ENHANCED fallback method...');
        
        // Load required libraries
        await Promise.all([
            PDFLibraryManager.loadHtml2Canvas(),
            PDFLibraryManager.loadJsPDF()
        ]);
        
        // Create properly positioned temp container
        const properContainer = await this.createProperTempContainer(contentElement);
        
        try {
            // CRITICAL FIX: Wait for all content to load
            PDFLibraryManager.updatePDFProgress(50, 'Loading all content...');
            await this.waitForAllImages(properContainer);
            await this.waitForMathJax(properContainer);
            await Utils.sleep(2000); // Extra wait
            
            DEBUG.info('Starting html2canvas from ENHANCED container...');
            PDFLibraryManager.updatePDFProgress(70, 'Creating canvas...');
            
            // Generate canvas with ENHANCED settings
            const canvas = await window.html2canvas(properContainer, {
                ...options.html2canvas,
                logging: false,
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                foreignObjectRendering: true,
                imageTimeout: 15000,
                onclone: function(clonedDoc) {
                    DEBUG.info('Document cloned for canvas generation');
                },
                onrendered: function(renderedCanvas) {
                    DEBUG.info(`Canvas created: ${renderedCanvas.width}x${renderedCanvas.height}`);
                }
            });
            
            DEBUG.info(`Enhanced canvas created: ${canvas.width}x${canvas.height}`);
            
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('Generated canvas is empty - content may not have rendered properly');
            }
            
            PDFLibraryManager.updatePDFProgress(85, 'Creating PDF from canvas...');
            
            // Convert canvas to PDF with better settings
            const { jsPDF } = window.jsPDF;
            const pdf = new jsPDF(options.jsPDF);
            
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
            
            DEBUG.success('Enhanced fallback PDF generation completed');
            
        } finally {
            // Always cleanup
            if (properContainer && properContainer.parentNode) {
                document.body.removeChild(properContainer);
                this.state.currentTempContainer = null;
                DEBUG.info('Enhanced temp container removed');
            }
        }
    },
    
    /**
     * Create properly positioned temp container - CRITICAL FIX
     */
    createProperTempContainer: async function(contentElement) {
        DEBUG.info('Creating PROPERLY positioned temp container...');
        
        // Clone content to avoid modifying original
        const clonedContent = contentElement.cloneNode(true);
        
        // Remove elements that shouldn't be in PDF
        const elementsToRemove = [
            '.file-navigation', '.project-navigation', '.back-to-home-btn',
            '.copy-code-btn', '.file-actions', 'script', 'button',
            '.pdf-btn', '.pdf-options-btn', '.download-file-btn'
        ];
        
        elementsToRemove.forEach(selector => {
            const elements = clonedContent.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        // CRITICAL FIX: Create a VISIBLE container that doesn't interfere with layout
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-temp-container-proper';
        
        // FIXED: Position container VISIBLY but outside viewport
        // This ensures images load and MathJax renders properly
        tempContainer.style.cssText = `
            position: fixed !important;
            top: 100vh !important;
            left: 0 !important;
            width: 794px !important;
            min-height: 1000px !important;
            background: white !important;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            color: #000 !important;
            padding: 20px !important;
            z-index: 9999 !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            overflow: visible !important;
            pointer-events: none !important;
            border: 1px solid #000 !important;
        `;
        
        // Add title to PDF
        const fileName = ContentRenderer.getCurrentFile() ? ContentRenderer.getCurrentFile().split('/').pop() : 'document';
        const title = document.createElement('h1');
        title.textContent = Utils.filenameToDisplayName(fileName);
        title.style.cssText = 'margin-bottom: 20px !important; color: #000 !important; font-size: 24px !important; font-weight: bold !important;';
        
        // Add comprehensive PDF-specific styles - ENHANCED
        this.addEnhancedPDFStyles(clonedContent);
        
        tempContainer.appendChild(title);
        tempContainer.appendChild(clonedContent);
        
        // Create a hidden wrapper to contain the temp container without affecting layout
        const hiddenWrapper = document.createElement('div');
        hiddenWrapper.style.cssText = `
            position: fixed !important;
            top: 100vh !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
            pointer-events: none !important;
            z-index: 9998 !important;
        `;
        
        hiddenWrapper.appendChild(tempContainer);
        document.body.appendChild(hiddenWrapper);
        
        // Store reference for cleanup
        this.state.currentTempContainer = hiddenWrapper;
        this.state.actualTempContainer = tempContainer;
        
        // CRITICAL: Wait for layout to stabilize
        await Utils.sleep(500);
        
        DEBUG.success(`PROPER temp container created: ${tempContainer.scrollWidth}x${tempContainer.scrollHeight}`);
        
        return tempContainer;
    },
    
    /**
     * Wait for all images to load - CRITICAL FIX
     */
    waitForAllImages: async function(container) {
        const images = container.querySelectorAll('img');
        DEBUG.info(`Waiting for ${images.length} images to load...`);
        
        if (images.length === 0) {
            DEBUG.info('No images found, skipping image load wait');
            return;
        }
        
        const imagePromises = Array.from(images).map(img => {
            return new Promise((resolve) => {
                if (img.complete && img.naturalHeight !== 0) {
                    DEBUG.info(`Image already loaded: ${img.src}`);
                    resolve();
                } else {
                    const timeout = setTimeout(() => {
                        DEBUG.warn(`Image load timeout: ${img.src}`);
                        resolve(); // Continue even if image fails
                    }, this.config.timeouts.imageLoad);
                    
                    img.onload = () => {
                        clearTimeout(timeout);
                        DEBUG.info(`Image loaded successfully: ${img.src}`);
                        resolve();
                    };
                    
                    img.onerror = () => {
                        clearTimeout(timeout);
                        DEBUG.warn(`Image failed to load: ${img.src}`);
                        resolve(); // Continue even if image fails
                    };
                    
                    // Trigger load if src is not set
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
     * Wait for MathJax to finish rendering - CRITICAL FIX
     */
    waitForMathJax: async function(container) {
        DEBUG.info('Waiting for MathJax to render mathematics...');
        
        // Check if MathJax is available
        if (!window.MathJax || !window.MathJax.typesetPromise) {
            DEBUG.info('MathJax not available, skipping math rendering');
            return;
        }
        
        // Find math elements
        const mathElements = container.querySelectorAll('[class*="math"], script[type*="math"], .MathJax, mjx-container');
        DEBUG.info(`Found ${mathElements.length} potential math elements`);
        
        try {
            // Wait for MathJax to process the container
            await Promise.race([
                window.MathJax.typesetPromise([container]),
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        DEBUG.warn('MathJax rendering timeout');
                        resolve(); // Continue even if timeout
                    }, this.config.timeouts.mathRender);
                })
            ]);
            
            DEBUG.success('MathJax rendering completed');
            
            // Additional wait for rendering to stabilize
            await Utils.sleep(1000);
            
        } catch (error) {
            DEBUG.warn('MathJax rendering error:', error);
            // Continue even if MathJax fails
        }
    },
    
    /**
     * Add enhanced PDF-specific styles - COMPREHENSIVE FIX
     */
    addEnhancedPDFStyles: function(contentElement) {
        const pdfStyles = document.createElement('style');
        pdfStyles.textContent = `
            /* CRITICAL: Force all elements to be visible and properly styled */
            *, *::before, *::after {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Body and text elements */
            body, div, p, span, a, li, td, th {
                color: #000 !important;
                background: transparent !important;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
            }
            
            /* Headings */
            h1, h2, h3, h4, h5, h6 {
                color: #000 !important;
                font-weight: bold !important;
                margin-top: 24px !important;
                margin-bottom: 12px !important;
                page-break-after: avoid !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            h4 { font-size: 16px !important; }
            h5 { font-size: 14px !important; }
            h6 { font-size: 12px !important; }
            
            /* Paragraphs and lists */
            p, li {
                color: #000 !important;
                line-height: 1.6 !important;
                margin-bottom: 12px !important;
            }
            
            /* Code blocks - ENHANCED */
            pre, code {
                background: #f8f9fa !important;
                border: 1px solid #e9ecef !important;
                padding: 8px !important;
                border-radius: 4px !important;
                font-family: 'Courier New', Consolas, Monaco, monospace !important;
                font-size: 12px !important;
                white-space: pre-wrap !important;
                color: #000 !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
            }
            
            pre {
                padding: 16px !important;
                margin: 16px 0 !important;
                overflow: visible !important;
            }
            
            /* Syntax highlighting - FIXED */
            .token.comment, .token.prolog, .token.doctype, .token.cdata { 
                color: #6a737d !important; 
            }
            .token.punctuation { 
                color: #6f42c1 !important; 
            }
            .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { 
                color: #005cc5 !important; 
            }
            .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { 
                color: #032f62 !important; 
            }
            .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { 
                color: #d73a49 !important; 
            }
            .token.atrule, .token.attr-value, .token.keyword { 
                color: #d73a49 !important; 
            }
            .token.function, .token.class-name { 
                color: #6f42c1 !important; 
            }
            
            /* Tables - ENHANCED */
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 16px 0 !important;
                page-break-inside: auto !important;
            }
            
            th, td {
                border: 1px solid #dee2e6 !important;
                padding: 8px 12px !important;
                text-align: left !important;
                color: #000 !important;
                vertical-align: top !important;
            }
            
            th {
                background: #f8f9fa !important;
                font-weight: bold !important;
            }
            
            tr {
                page-break-inside: avoid !important;
            }
            
            /* Images - CRITICAL FIX */
            img {
                max-width: 700px !important;
                height: auto !important;
                display: block !important;
                margin: 16px auto !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 4px !important;
                page-break-inside: avoid !important;
                /* CRITICAL: Ensure images are visible and loaded */
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            /* Math elements - CRITICAL FIX */
            .MathJax, .MathJax_Display, mjx-container, .math-display {
                color: #000 !important;
                background: transparent !important;
                display: block !important;
                margin: 16px 0 !important;
                overflow: visible !important;
                /* CRITICAL: Ensure math is visible */
                opacity: 1 !important;
                visibility: visible !important;
            }
            
            mjx-container mjx-math {
                color: #000 !important;
                filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
            
            /* Inline math */
            mjx-container[jax="CHTML"][display="true"] {
                display: block !important;
                text-align: center !important;
                margin: 1em 0 !important;
            }
            
            /* Block quotes */
            blockquote {
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
            
            /* Lists */
            ul, ol {
                padding-left: 20px !important;
                margin: 16px 0 !important;
            }
            
            li {
                margin-bottom: 4px !important;
            }
            
            /* Horizontal rules */
            hr {
                border: none !important;
                border-top: 1px solid #dee2e6 !important;
                margin: 24px 0 !important;
            }
            
            /* Page breaks */
            .page-break-before {
                page-break-before: always !important;
            }
            
            .page-break-after {
                page-break-after: always !important;
            }
            
            /* Hide unwanted elements */
            .copy-code-btn, .heading-anchor, button, .file-actions, .file-navigation {
                display: none !important;
            }
            
            /* Ensure content flows properly */
            .markdown-content, .file-content, .content-area {
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
            }
        `;
        
        contentElement.insertBefore(pdfStyles, contentElement.firstChild);
        DEBUG.info('Enhanced PDF styles applied');
    },
    
    /**
     * Build PDF options from defaults and user options
     */
    buildPDFOptions: function(fileName, userOptions = {}) {
        const defaultOptions = this.config.defaultOptions;
        
        return {
            margin: userOptions.margin || defaultOptions.margin,
            filename: `${Utils.getFilenameWithoutExtension(fileName)}.pdf`,
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
            if (element && element.innerHTML.trim().length > 0) {
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
        const currentLang = UI.getCurrentLanguage();
        
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
     * Clean up temporary PDF elements - ENHANCED
     */
    cleanupPDFGeneration: function() {
        // Clean up main temp container
        if (this.state.currentTempContainer) {
            try {
                if (this.state.currentTempContainer.parentNode) {
                    document.body.removeChild(this.state.currentTempContainer);
                }
                this.state.currentTempContainer = null;
                this.state.actualTempContainer = null;
                DEBUG.info('PDF temp containers cleaned up');
            } catch (error) {
                DEBUG.warn('Error during PDF cleanup:', error);
            }
        }
        
        // Remove any leftover temp elements
        const tempContainers = document.querySelectorAll('#pdf-temp-container, #pdf-temp-container-proper');
        tempContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        // Clean up any hidden wrappers
        const hiddenWrappers = document.querySelectorAll('div[style*="position: fixed"][style*="100vh"]');
        hiddenWrappers.forEach(wrapper => {
            if (wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            }
        });
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
            hasTempContainer: !!this.state.currentTempContainer,
            timeouts: this.config.timeouts
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFGenerator (FIXED) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
