/**
 * PDF Generator - REGRESSION FIXES VERSION
 * Fixes: Math overlap, missing text, image page breaks, empty long PDFs
 * Back to working basics with incremental improvements
 */

window.PDFGenerator = {
    
    // PDF Generation state
    state: {
        generatingPDF: false,
        currentTempContainer: null,
        mathJaxReady: false
    },
    
    // Configuration - CONSERVATIVE SETTINGS
    config: {
        defaultOptions: {
            margin: [15, 15, 15, 15], // Larger margins for safety
            image: { type: 'jpeg', quality: 0.95 }, // Slightly lower quality for stability
            html2canvas: { 
                scale: 1.5, // Reduced scale to prevent memory issues
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 800, // Fixed width
                height: null // Let height be calculated
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: false // Disable compression for debugging
            }
        },
        // Simplified content selectors - most reliable first
        contentSelectors: [
            '#main-markdown-content',
            '.markdown-content',
            '#main-code-content',
            '.code-content',
            '#main-data-content',
            '.data-content'
        ],
        // Wait times for proper rendering
        waitTimes: {
            domRender: 1000,      // Wait for DOM
            mathJax: 2000,        // Wait for MathJax
            finalRender: 500      // Final wait
        }
    },
    
    /**
     * Generate PDF - MAIN ENTRY POINT (Simplified)
     */
    generateAdvancedPDF: async function(options = {}) {
        console.log('=== STARTING PDF GENERATION (REGRESSION FIX) ===');
        
        if (this.state.generatingPDF) {
            console.warn('PDF generation already in progress');
            return;
        }
        
        this.state.generatingPDF = true;
        
        try {
            // Show progress
            PDFLibraryManager.showPDFProgress('Starting PDF generation...', 0);
            
            const currentFile = ContentRenderer.getCurrentFile();
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            console.log(`PDF generation for file: ${fileName}`);
            
            // Update progress
            PDFLibraryManager.updatePDFProgress(10, 'Finding content...');
            
            // Find content - more reliable method
            const contentElement = this.findContentForPDF();
            if (!contentElement) {
                throw new Error('No content found for PDF generation');
            }
            
            console.log(`Content found: ${contentElement.tagName}.${contentElement.className}`);
            console.log(`Content size: ${contentElement.innerHTML.length} chars`);
            
            PDFLibraryManager.updatePDFProgress(20, 'Loading PDF libraries...');
            
            // Load html2pdf.js library
            await PDFLibraryManager.loadHtml2PDF();
            
            PDFLibraryManager.updatePDFProgress(30, 'Preparing content for PDF...');
            
            // Create temp container with WORKING method
            const tempContainer = await this.createWorkingTempContainer(contentElement);
            
            PDFLibraryManager.updatePDFProgress(60, 'Generating PDF...');
            
            // Configure PDF options
            const pdfOptions = this.buildPDFOptions(fileName, options);
            
            // Generate PDF with working method
            await this.generatePDFWithWorkingMethod(tempContainer, pdfOptions);
            
            PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
            console.log('✅ PDF generation completed successfully');
            
            // Hide progress after delay
            setTimeout(() => {
                PDFLibraryManager.hidePDFProgress();
            }, 1500);
            
            if (UI && UI.showNotification) {
                UI.showNotification('PDF downloaded successfully', 'success');
            }
            
        } catch (error) {
            console.error('❌ PDF generation failed:', error);
            PDFLibraryManager.hidePDFProgress();
            
            if (UI && UI.showNotification) {
                UI.showNotification(`PDF generation failed: ${error.message}`, 'error');
            }
            
            // Show error to user on Android
            if (typeof AndroidDebug !== 'undefined') {
                AndroidDebug.error(`PDF Error: ${error.message}`);
            }
            
            throw error;
        } finally {
            this.state.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
    },
    
    /**
     * Build PDF options - CONSERVATIVE
     */
    buildPDFOptions: function(fileName, userOptions = {}) {
        const defaults = this.config.defaultOptions;
        
        return {
            margin: userOptions.margin || defaults.margin,
            filename: `${Utils.getFilenameWithoutExtension(fileName)}.pdf`,
            image: { ...defaults.image },
            html2canvas: { 
                ...defaults.html2canvas,
                ...userOptions.html2canvas
            },
            jsPDF: { 
                ...defaults.jsPDF,
                orientation: userOptions.orientation || defaults.jsPDF.orientation
            }
        };
    },
    
    /**
     * Find content - SIMPLIFIED AND RELIABLE
     */
    findContentForPDF: function() {
        console.log('Looking for content to convert to PDF...');
        
        for (const selector of this.config.contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerHTML.trim().length > 0) {
                console.log(`✅ Found content: ${selector}`);
                return element;
            } else {
                console.log(`❌ Not found or empty: ${selector}`);
            }
        }
        
        console.error('No suitable content found for PDF');
        return null;
    },
    
    /**
     * Create temp container - BACK TO WORKING METHOD
     */
    createWorkingTempContainer: async function(contentElement) {
        console.log('Creating temp container for PDF...');
        
        // Clean up any existing containers first
        this.cleanupPDFGeneration();
        
        // Clone the content completely
        const clonedContent = contentElement.cloneNode(true);
        console.log(`Content cloned: ${clonedContent.innerHTML.length} chars`);
        
        // Remove interactive elements that shouldn't be in PDF
        this.removeInteractiveElements(clonedContent);
        
        // Create container with SIMPLE, WORKING approach
        const tempContainer = document.createElement('div');
        tempContainer.id = 'pdf-temp-container';
        tempContainer.style.cssText = `
            position: absolute;
            top: -5000px;
            left: 0;
            width: 800px;
            background: white;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: black;
            padding: 20px;
            z-index: 1000;
        `;
        
        // Add document title
        const currentFile = ContentRenderer.getCurrentFile();
        if (currentFile) {
            const fileName = currentFile.split('/').pop();
            const title = document.createElement('h1');
            title.textContent = Utils.filenameToDisplayName(fileName);
            title.style.cssText = `
                color: black;
                font-size: 24px;
                margin-bottom: 20px;
                page-break-after: avoid;
            `;
            tempContainer.appendChild(title);
        }
        
        // Add the cloned content
        tempContainer.appendChild(clonedContent);
        
        // Apply PDF-specific styles
        this.addPDFStyles(tempContainer);
        
        // Add to DOM (off-screen)
        document.body.appendChild(tempContainer);
        this.state.currentTempContainer = tempContainer;
        
        console.log('Temp container added to DOM, waiting for rendering...');
        
        // Wait for DOM to settle
        await this.waitForRendering(tempContainer);
        
        console.log(`✅ Temp container ready: ${tempContainer.offsetWidth}x${tempContainer.offsetHeight}`);
        
        return tempContainer;
    },
    
    /**
     * Remove interactive elements
     */
    removeInteractiveElements: function(container) {
        const selectorsToRemove = [
            '.file-navigation',
            '.project-navigation', 
            '.back-to-home-btn',
            '.copy-code-btn',
            '.file-actions',
            'button',
            'script',
            '.pdf-btn',
            '.pdf-options-btn',
            '.download-file-btn'
        ];
        
        selectorsToRemove.forEach(selector => {
            const elements = container.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        });
        
        console.log('Interactive elements removed from PDF content');
    },
    
    /**
     * Wait for proper rendering
     */
    waitForRendering: async function(container) {
        // Wait for DOM rendering
        await Utils.sleep(this.config.waitTimes.domRender);
        
        // Wait for MathJax if available
        if (window.MathJax && window.MathJax.typesetPromise) {
            console.log('Waiting for MathJax to render...');
            try {
                await window.MathJax.typesetPromise([container]);
                await Utils.sleep(this.config.waitTimes.mathJax); // Extra wait for complex math
                console.log('✅ MathJax rendering completed');
                this.state.mathJaxReady = true;
            } catch (mathError) {
                console.warn('MathJax rendering failed:', mathError);
                this.state.mathJaxReady = false;
            }
        }
        
        // Final wait for everything to settle
        await Utils.sleep(this.config.waitTimes.finalRender);
    },
    
    /**
     * Add PDF-specific styles - FIXED FOR REGRESSION ISSUES
     */
    addPDFStyles: function(container) {
        const style = document.createElement('style');
        style.textContent = `
            /* BASIC PDF STYLES - CONSERVATIVE APPROACH */
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            /* TYPOGRAPHY FIXES */
            body, div, p, span, li {
                color: black !important;
                font-family: 'Segoe UI', Arial, sans-serif !important;
                line-height: 1.6 !important;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: black !important;
                font-weight: bold !important;
                margin-top: 20px !important;
                margin-bottom: 10px !important;
                page-break-after: avoid !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            h4 { font-size: 16px !important; }
            
            p {
                margin-bottom: 12px !important;
                color: black !important;
            }
            
            /* MATH FIXES - PREVENT OVERLAP */
            .MathJax, .MathJax_Display, mjx-container {
                display: inline-block !important;
                margin: 2px 4px !important;
                vertical-align: baseline !important;
                line-height: 1.2 !important;
            }
            
            /* Display math should be on its own line */
            mjx-container[display="true"], .MathJax_Display {
                display: block !important;
                text-align: center !important;
                margin: 16px 0 !important;
                clear: both !important;
            }
            
            /* Remove shadows and effects from math */
            mjx-container mjx-math {
                filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
                background: transparent !important;
            }
            
            mjx-container mjx-math * {
                color: black !important;
                fill: black !important;
            }
            
            /* CODE BLOCKS */
            pre, code {
                font-family: 'Courier New', monospace !important;
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                padding: 8px !important;
                border-radius: 4px !important;
                page-break-inside: avoid !important;
                overflow: visible !important;
                white-space: pre-wrap !important;
            }
            
            pre {
                margin: 16px 0 !important;
                max-width: 100% !important;
            }
            
            /* TABLES */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 16px 0 !important;
                page-break-inside: avoid !important;
            }
            
            th, td {
                border: 1px solid #ddd !important;
                padding: 8px !important;
                text-align: left !important;
                color: black !important;
                vertical-align: top !important;
            }
            
            th {
                background: #f0f0f0 !important;
                font-weight: bold !important;
            }
            
            /* IMAGE FIXES - PREVENT PAGE BREAK ISSUES */
            img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 16px auto !important;
                page-break-inside: avoid !important;
                page-break-before: auto !important;
                page-break-after: auto !important;
            }
            
            /* Specific image size limits for PDF */
            img {
                max-width: 700px !important;
                max-height: 500px !important;
            }
            
            /* LISTS */
            ul, ol {
                margin: 16px 0 !important;
                padding-left: 20px !important;
            }
            
            li {
                margin-bottom: 4px !important;
                page-break-inside: avoid !important;
            }
            
            /* BLOCKQUOTES */
            blockquote {
                border-left: 4px solid #ccc !important;
                margin: 16px 0 !important;
                padding-left: 16px !important;
                font-style: italic !important;
                page-break-inside: avoid !important;
            }
            
            /* GENERAL PAGE BREAK RULES */
            .page-break-before { page-break-before: always !important; }
            .page-break-after { page-break-after: always !important; }
            .page-break-avoid { page-break-inside: avoid !important; }
            
            /* Prevent breaks in critical elements */
            h1, h2, h3, h4, h5, h6,
            .math-display, 
            pre, 
            table,
            blockquote {
                page-break-inside: avoid !important;
            }
        `;
        
        container.appendChild(style);
        console.log('PDF styles applied to temp container');
    },
    
    /**
     * Generate PDF with working method - SIMPLIFIED
     */
    generatePDFWithWorkingMethod: async function(container, options) {
        console.log('Starting PDF generation with html2pdf...');
        console.log('Container size:', container.offsetWidth, 'x', container.offsetHeight);
        console.log('Container content length:', container.innerHTML.length);
        
        try {
            // Use html2pdf with CONSERVATIVE settings
            await window.html2pdf()
                .set({
                    margin: options.margin,
                    filename: options.filename,
                    image: options.image,
                    html2canvas: {
                        scale: options.html2canvas.scale,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        width: container.offsetWidth,
                        height: container.offsetHeight
                    },
                    jsPDF: options.jsPDF
                })
                .from(container)
                .save();
            
            console.log('✅ PDF generated and downloaded successfully');
            
        } catch (error) {
            console.error('❌ html2pdf failed:', error);
            throw error;
        }
    },
    
    /**
     * Generate PDF with options dialog
     */
    generatePDFWithOptions: async function() {
        const currentLang = UI.getCurrentLanguage();
        
        const orientation = confirm(currentLang === 'fi' ? 
            'Käytä pystysuuntaa? (Peruuta = vaakasuunta)' : 
            'Use portrait orientation? (Cancel = landscape)') ? 'portrait' : 'landscape';
        
        const options = {
            orientation: orientation,
            margin: orientation === 'portrait' ? [15, 15, 15, 15] : [10, 10, 10, 10]
        };
        
        await this.generateAdvancedPDF(options);
    },
    
    /**
     * Clean up - COMPREHENSIVE
     */
    cleanupPDFGeneration: function() {
        console.log('Cleaning up PDF generation...');
        
        // Remove tracked container
        if (this.state.currentTempContainer) {
            try {
                if (this.state.currentTempContainer.parentNode) {
                    document.body.removeChild(this.state.currentTempContainer);
                    console.log('Tracked temp container removed');
                }
            } catch (error) {
                console.warn('Error removing tracked container:', error);
            }
            this.state.currentTempContainer = null;
        }
        
        // Remove any orphaned containers
        const tempContainers = document.querySelectorAll('#pdf-temp-container');
        tempContainers.forEach((container, index) => {
            try {
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                    console.log(`Orphaned temp container ${index + 1} removed`);
                }
            } catch (error) {
                console.warn(`Error removing orphaned container ${index + 1}:`, error);
            }
        });
        
        // Reset state
        this.state.mathJaxReady = false;
        
        console.log('PDF cleanup completed');
    },
    
    /**
     * Get status
     */
    getStatus: function() {
        return {
            generating: this.state.generatingPDF,
            hasTempContainer: !!this.state.currentTempContainer,
            mathJaxReady: this.state.mathJaxReady,
            tempContainersInDOM: document.querySelectorAll('#pdf-temp-container').length
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('PDFGenerator (Regression Fix) loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
