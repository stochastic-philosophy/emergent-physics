/**
 * PDF Generator - Core PDF Generation Module
 * Handles PDF generation from content with full visual fidelity
 * Uses VISIBLE temp elements to fix rendering issues
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
                logging: false
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
        ]
    },
    
    /**
     * Generate PDF with full visual fidelity - MAIN ENTRY POINT
     */
    generateAdvancedPDF: async function(options = {}) {
        DEBUG.info('=== GENERATING ADVANCED PDF (VISIBILITY FIXED) ===');
        
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
            
            // Try html2pdf.js first (best quality)
            try {
                PDFLibraryManager.updatePDFProgress(30, 'Generating PDF with html2pdf.js...');
                await this.generatePDFWithVisibleElement(contentElement, pdfOptions);
                PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                DEBUG.success('PDF generated with html2pdf.js');
            } catch (html2pdfError) {
                DEBUG.warn('html2pdf.js failed, trying fallback method:', html2pdfError);
                PDFLibraryManager.updatePDFProgress(40, 'Trying alternative method...');
                await this.generatePDFWithFallbackVisible(contentElement, pdfOptions);
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
            if (UI.showNotification) {
                UI.showNotification(`PDF generation failed: ${error.message}`, 'error');
            }
            throw error;
        } finally {
            this.state.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
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
     * Generate PDF using VISIBLE element - FIXED VERSION
     */
    generatePDFWithVisibleElement: async function(contentElement, options) {
        DEBUG.info('Generating PDF with VISIBLE element method...');
        
        // Load html2pdf.js if needed
        await PDFLibraryManager.loadHtml2PDF();
        
        // Create VISIBLE temp container
        const visibleContainer = await this.createVisibleTempContainer(contentElement);
        
        try {
            DEBUG.info(`VISIBLE container dimensions: ${visibleContainer.scrollWidth}x${visibleContainer.scrollHeight}`);
            
            // Configure html2pdf options for visible element
            const html2pdfOptions = {
                margin: options.margin,
                filename: options.filename,
                image: options.image,
                html2canvas: {
                    ...options.html2canvas,
                    width: visibleContainer.scrollWidth,
                    height: visibleContainer.scrollHeight
                },
                jsPDF: options.jsPDF,
                pagebreak: options.pagebreak
            };
            
            DEBUG.info('Starting html2pdf generation from VISIBLE element...');
            
            // Generate PDF from visible element
            await window.html2pdf()
                .set(html2pdfOptions)
                .from(visibleContainer)
                .toPdf()
                .save();
            
            DEBUG.success('PDF generated successfully from VISIBLE element');
            
        } finally {
            // Always cleanup the visible container
            if (visibleContainer && visibleContainer.parentNode) {
                document.body.removeChild(visibleContainer);
                this.state.currentTempContainer = null;
                DEBUG.info('VISIBLE temp container removed');
            }
        }
    },
    
    /**
     * Generate PDF using fallback with VISIBLE element
     */
    generatePDFWithFallbackVisible: async function(contentElement, options) {
        DEBUG.info('Generating PDF with fallback + VISIBLE element...');
        
        // Load required libraries
        await Promise.all([
            PDFLibraryManager.loadHtml2Canvas(),
            PDFLibraryManager.loadJsPDF()
        ]);
        
        // Create VISIBLE temp container
        const visibleContainer = await this.createVisibleTempContainer(contentElement);
        
        try {
            DEBUG.info('Starting html2canvas from VISIBLE element...');
            
            // Generate canvas from VISIBLE HTML
            const canvas = await window.html2canvas(visibleContainer, {
                ...options.html2canvas,
                logging: false
            });
            
            DEBUG.info(`Canvas created from VISIBLE element: ${canvas.width}x${canvas.height}`);
            
            if (canvas.width === 0 || canvas.height === 0) {
                throw new Error('Generated canvas from VISIBLE element is empty');
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
            
            DEBUG.success('Fallback PDF generation completed with VISIBLE element');
            
        } finally {
            // Always cleanup the visible container
            if (visibleContainer && visibleContainer.parentNode) {
                document.body.removeChild(visibleContainer);
                this.state.currentTempContainer = null;
                DEBUG.info('VISIBLE temp container removed (fallback)');
            }
        }
    },
    
    /**
     * Create VISIBLE temp container for PDF generation - KEY FIX
     */
    createVisibleTempContainer: async function(contentElement) {
        DEBUG.info('Creating VISIBLE temp container for PDF...');
        
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
        
        // Wait for MathJax if available
        if (window.MathJax && window.MathJax.typesetPromise) {
            DEBUG.info('Waiting for MathJax in VISIBLE element...');
            try {
                await window.MathJax.typesetPromise([clonedContent]);
                DEBUG.success('MathJax rendered in VISIBLE element');
            } catch (mathError) {
                DEBUG.warn('MathJax rendering failed:', mathError);
            }
        }
        
        // Create VISIBLE temp container - THIS IS THE KEY FIX
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-temp-container';
        
        // IMPORTANT: Position off-screen but VISIBLE (not display:none or opacity:0)
        tempContainer.style.cssText = `
            position: absolute !important;
            top: -3000px !important;
            left: 0 !important;
            width: 794px !important;
            min-height: 1000px !important;
            background: white !important;
            font-family: 'Segoe UI', sans-serif !important;
            line-height: 1.6 !important;
            color: #000 !important;
            padding: 20px !important;
            z-index: 1000 !important;
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
        `;
        
        // Add title to PDF
        const fileName = ContentRenderer.getCurrentFile() ? ContentRenderer.getCurrentFile().split('/').pop() : 'document';
        const title = document.createElement('h1');
        title.textContent = Utils.filenameToDisplayName(fileName);
        title.style.cssText = 'margin-bottom: 20px !important; color: #000 !important; font-size: 24px !important;';
        
        // Add PDF-specific styles
        this.addPDFStyles(clonedContent);
        
        tempContainer.appendChild(title);
        tempContainer.appendChild(clonedContent);
        document.body.appendChild(tempContainer);
        
        // Store reference for cleanup
        this.state.currentTempContainer = tempContainer;
        
        // Wait for rendering - VISIBLE element renders faster
        await Utils.sleep(500);
        
        DEBUG.success(`VISIBLE temp container created: ${tempContainer.scrollWidth}x${tempContainer.scrollHeight}`);
        
        return tempContainer;
    },
    
    /**
     * Add PDF-specific styles to improve rendering
     */
    addPDFStyles: function(contentElement) {
        const pdfStyles = document.createElement('style');
        pdfStyles.textContent = `
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            
            body, div, p, h1, h2, h3, h4, h5, h6, pre, code, table, tr, td, th, li, span {
                color: #000 !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            pre, code {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                padding: 8px !important;
                border-radius: 4px !important;
                font-family: 'Courier New', monospace !important;
                white-space: pre-wrap !important;
                color: #000 !important;
            }
            
            .token.comment { color: #6a9955 !important; }
            .token.keyword { color: #0000ff !important; }
            .token.string { color: #a31515 !important; }
            .token.number { color: #098658 !important; }
            .token.function { color: #795e26 !important; }
            
            table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 16px 0 !important;
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
            
            h1, h2, h3, h4, h5, h6 {
                color: #000 !important;
                margin-top: 24px !important;
                margin-bottom: 12px !important;
            }
            
            p, li {
                color: #000 !important;
                line-height: 1.6 !important;
            }
            
            img {
                max-width: 700px !important;
                height: auto !important;
                display: block !important;
                margin: 16px 0 !important;
            }
            
            /* Special handling for math elements */
            .MathJax, .MathJax_Display, mjx-container {
                color: #000 !important;
                background: transparent !important;
            }
            
            /* Ensure LaTeX formulas don't have shadows */
            mjx-container mjx-math {
                filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
            }
        `;
        
        contentElement.insertBefore(pdfStyles, contentElement.firstChild);
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
     * Clean up temporary PDF elements
     */
    cleanupPDFGeneration: function() {
        if (this.state.currentTempContainer) {
            try {
                if (this.state.currentTempContainer.parentNode) {
                    document.body.removeChild(this.state.currentTempContainer);
                }
                this.state.currentTempContainer = null;
                DEBUG.info('PDF temp container cleaned up');
            } catch (error) {
                DEBUG.warn('Error during PDF cleanup:', error);
            }
        }
        
        // Remove any other PDF temp elements
        const tempContainers = document.querySelectorAll('#pdf-temp-container');
        tempContainers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
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
            hasTempContainer: !!this.state.currentTempContainer
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFGenerator module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
