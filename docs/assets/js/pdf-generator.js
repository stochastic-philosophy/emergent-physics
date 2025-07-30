/**
 * PDF Generator - MATH OVERLAP & IMAGE FIXES
 * Fixes: Duplicate LaTeX rendering, math positioning, image page breaks
 */

window.PDFGenerator = {
    
    // PDF Generation state
    state: {
        generatingPDF: false,
        currentTempContainer: null,
        mathJaxReady: false
    },
    
    // Configuration
    config: {
        defaultOptions: {
            margin: [15, 15, 15, 15],
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: { 
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 800,
                height: null
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait',
                compress: false
            }
        },
        contentSelectors: [
            '#main-markdown-content',
            '.markdown-content',
            '#main-code-content',
            '.code-content',
            '#main-data-content',
            '.data-content'
        ],
        waitTimes: {
            domRender: 1000,
            mathJax: 3000,  // Increased for complex math
            finalRender: 1000
        }
    },
    
    /**
     * Generate PDF - MAIN ENTRY POINT
     */
    generateAdvancedPDF: async function(options = {}) {
        console.log('=== PDF GENERATION (MATH & IMAGE FIXES) ===');
        
        if (this.state.generatingPDF) {
            console.warn('PDF generation already in progress');
            return;
        }
        
        this.state.generatingPDF = true;
        
        try {
            PDFLibraryManager.showPDFProgress('Starting PDF generation...', 0);
            
            const currentFile = ContentRenderer.getCurrentFile();
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            console.log(`PDF generation for file: ${fileName}`);
            
            PDFLibraryManager.updatePDFProgress(10, 'Finding content...');
            
            const contentElement = this.findContentForPDF();
            if (!contentElement) {
                throw new Error('No content found for PDF generation');
            }
            
            console.log(`Content found: ${contentElement.tagName}.${contentElement.className}`);
            
            PDFLibraryManager.updatePDFProgress(20, 'Loading PDF libraries...');
            await PDFLibraryManager.loadHtml2PDF();
            
            PDFLibraryManager.updatePDFProgress(30, 'Preparing content...');
            const tempContainer = await this.createMathFixedTempContainer(contentElement);
            
            PDFLibraryManager.updatePDFProgress(70, 'Generating PDF...');
            const pdfOptions = this.buildPDFOptions(fileName, options);
            
            await this.generatePDFWithFixedMethod(tempContainer, pdfOptions);
            
            PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
            console.log('✅ PDF generation completed successfully');
            
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
            
            throw error;
        } finally {
            this.state.generatingPDF = false;
            this.cleanupPDFGeneration();
        }
    },
    
    /**
     * Build PDF options
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
     * Find content for PDF
     */
    findContentForPDF: function() {
        console.log('Looking for content to convert to PDF...');
        
        for (const selector of this.config.contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.innerHTML.trim().length > 0) {
                console.log(`✅ Found content: ${selector}`);
                return element;
            }
        }
        
        console.error('No suitable content found for PDF');
        return null;
    },
    
    /**
     * Create temp container with MATH FIXES
     */
    createMathFixedTempContainer: async function(contentElement) {
        console.log('Creating math-fixed temp container...');
        
        this.cleanupPDFGeneration();
        
        // Clone content
        const clonedContent = contentElement.cloneNode(true);
        console.log(`Content cloned: ${clonedContent.innerHTML.length} chars`);
        
        // Remove interactive elements
        this.removeInteractiveElements(clonedContent);
        
        // CRITICAL: Clean existing MathJax output to prevent duplicates
        this.cleanMathJaxDuplicates(clonedContent);
        
        // Create container
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
        
        // Add title
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
        
        tempContainer.appendChild(clonedContent);
        
        // Apply FIXED PDF styles
        this.addFixedPDFStyles(tempContainer);
        
        document.body.appendChild(tempContainer);
        this.state.currentTempContainer = tempContainer;
        
        console.log('Temp container added, waiting for rendering...');
        
        await this.waitForMathRendering(tempContainer);
        
        console.log(`✅ Math-fixed container ready: ${tempContainer.offsetWidth}x${tempContainer.offsetHeight}`);
        
        return tempContainer;
    },
    
    /**
     * Clean MathJax duplicates - CRITICAL FIX
     */
    cleanMathJaxDuplicates: function(container) {
        console.log('Cleaning MathJax duplicates...');
        
        // Remove all existing MathJax output elements
        const mathJaxElements = container.querySelectorAll(
            'mjx-container, .MathJax, .MathJax_Display, .MathJax_Preview, mjx-assistive-mml'
        );
        
        console.log(`Found ${mathJaxElements.length} existing MathJax elements to remove`);
        
        mathJaxElements.forEach(el => {
            el.remove();
        });
        
        // Also remove any MathJax scripts
        const scripts = container.querySelectorAll('script[type*="math"]');
        scripts.forEach(script => script.remove());
        
        console.log('MathJax cleanup completed');
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
        
        console.log('Interactive elements removed');
    },
    
    /**
     * Wait for math rendering with fixes
     */
    waitForMathRendering: async function(container) {
        // Wait for DOM
        await Utils.sleep(this.config.waitTimes.domRender);
        
        // Re-render MathJax in clean container
        if (window.MathJax && window.MathJax.typesetPromise) {
            console.log('Re-rendering MathJax in clean container...');
            try {
                // Clear MathJax state for this container
                if (window.MathJax.startup && window.MathJax.startup.document) {
                    window.MathJax.startup.document.clear();
                }
                
                await window.MathJax.typesetPromise([container]);
                
                // Extra wait for complex math to settle
                await Utils.sleep(this.config.waitTimes.mathJax);
                
                console.log('✅ MathJax re-rendering completed');
                this.state.mathJaxReady = true;
                
                // Verify no duplicates created
                const mathElements = container.querySelectorAll('mjx-container');
                console.log(`Final math elements count: ${mathElements.length}`);
                
            } catch (mathError) {
                console.warn('MathJax re-rendering failed:', mathError);
                this.state.mathJaxReady = false;
            }
        }
        
        // Final wait
        await Utils.sleep(this.config.waitTimes.finalRender);
    },
    
    /**
     * Add FIXED PDF styles
     */
    addFixedPDFStyles: function(container) {
        const style = document.createElement('style');
        style.textContent = `
            /* MATH OVERLAP FIXES */
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            /* TYPOGRAPHY */
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
                clear: both !important;
            }
            
            h1 { font-size: 24px !important; }
            h2 { font-size: 20px !important; }
            h3 { font-size: 18px !important; }
            h4 { font-size: 16px !important; }
            
            p {
                margin-bottom: 12px !important;
                color: black !important;
                clear: both !important;
            }
            
            /* CRITICAL MATH FIXES - PREVENT OVERLAPS */
            mjx-container {
                display: inline-block !important;
                margin: 0 2px !important;
                vertical-align: baseline !important;
                position: static !important;
                transform: none !important;
            }
            
            /* Inline math (single $) */
            mjx-container[display="false"] {
                display: inline !important;
                margin: 0 1px !important;
                vertical-align: baseline !important;
                line-height: inherit !important;
            }
            
            /* Display math (double $$) */
            mjx-container[display="true"] {
                display: block !important;
                text-align: center !important;
                margin: 16px auto !important;
                clear: both !important;
                width: 100% !important;
                position: static !important;
            }
            
            /* Math content fixes */
            mjx-container mjx-math {
                display: inline-block !important;
                position: static !important;
                transform: none !important;
                filter: none !important;
                text-shadow: none !important;
                box-shadow: none !important;
                background: transparent !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            mjx-container mjx-math * {
                color: black !important;
                fill: black !important;
                position: static !important;
                transform: none !important;
            }
            
            /* Remove any absolute positioning from math */
            mjx-container *[style*="position"] {
                position: static !important;
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
                clear: both !important;
            }
            
            pre {
                margin: 16px 0 !important;
                max-width: 100% !important;
            }
            
            /* ENHANCED IMAGE FIXES */
            img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 20px auto !important;
                page-break-inside: avoid !important;
                page-break-before: auto !important;
                page-break-after: auto !important;
                clear: both !important;
            }
            
            /* Specific image constraints for PDF */
            img {
                max-width: 700px !important;
                max-height: 400px !important;
            }
            
            /* Force page breaks around large images */
            img[width], img[height] {
                page-break-before: auto !important;
                page-break-after: auto !important;
                margin-top: 20px !important;
                margin-bottom: 20px !important;
            }
            
            /* Image containers */
            .image-content, figure {
                page-break-inside: avoid !important;
                margin: 20px 0 !important;
                clear: both !important;
            }
            
            /* TABLES */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 16px 0 !important;
                page-break-inside: avoid !important;
                clear: both !important;
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
            
            /* LISTS */
            ul, ol {
                margin: 16px 0 !important;
                padding-left: 20px !important;
                clear: both !important;
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
                clear: both !important;
            }
            
            /* GENERAL CLEAR FIXES */
            .markdown-content > * {
                clear: both !important;
            }
            
            /* Prevent elements from floating over each other */
            * {
                float: none !important;
                position: static !important;
            }
        `;
        
        container.appendChild(style);
        console.log('Fixed PDF styles applied');
    },
    
    /**
     * Generate PDF with fixed method
     */
    generatePDFWithFixedMethod: async function(container, options) {
        console.log('Starting PDF generation...');
        console.log('Container size:', container.offsetWidth, 'x', container.offsetHeight);
        
        try {
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
            
            console.log('✅ PDF generated successfully');
            
        } catch (error) {
            console.error('❌ PDF generation failed:', error);
            throw error;
        }
    },
    
    /**
     * Generate PDF with options
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
     * Cleanup
     */
    cleanupPDFGeneration: function() {
        console.log('Cleaning up PDF generation...');
        
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('PDFGenerator (Math & Image Fixes) loaded');
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
