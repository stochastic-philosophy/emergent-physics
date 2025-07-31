/**
 * PDF Generator - Tablet-Friendly Debug Version
 * Shows debug info directly on screen and uses DIRECT content rendering
 * NO temp containers - uses visible content directly
 */

window.PDFGenerator = {
    
    // PDF Generation state
    state: {
        generatingPDF: false,
        debugInfo: []
    },
    
    // Configuration - SIMPLIFIED
    config: {
        defaultOptions: {
            margin: [10, 10, 10, 10],
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 1, // REDUCED for better compatibility
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false, // Disabled for tablets
                width: 800,
                height: 1200
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
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
            '.text-content'
        ]
    },
    
    /**
     * Generate PDF with direct content access - SIMPLIFIED
     */
    generateAdvancedPDF: async function(options = {}) {
        this.addDebugInfo('🚀 Starting PDF generation...');
        
        if (this.state.generatingPDF) {
            this.showDebugPopup('PDF generation already in progress');
            return;
        }
        
        this.state.generatingPDF = true;
        this.state.debugInfo = [];
        
        try {
            // Show progress
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.showPDFProgress('Generating PDF (Debug Mode)...', 0);
            }
            
            // Get current file name
            const currentFile = ContentRenderer ? ContentRenderer.getCurrentFile() : null;
            this.addDebugInfo(`📄 Current file: ${currentFile || 'No file'}`);
            
            if (!currentFile) {
                throw new Error('No file currently loaded');
            }
            
            const fileName = currentFile.split('/').pop();
            this.addDebugInfo(`📝 File name: ${fileName}`);
            
            // Find content element - WITH DEBUG
            const contentElement = this.findContentForPDFWithDebug();
            if (!contentElement) {
                this.showDebugPopup('❌ No content found for PDF generation');
                throw new Error('No content found');
            }
            
            // Configure PDF options
            const pdfOptions = this.buildPDFOptions(fileName, options);
            this.addDebugInfo(`⚙️ PDF options configured`);
            
            // Update progress
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(30, 'Using direct content method...');
            }
            
            // Use DIRECT method - no temp containers
            await this.generatePDFDirectMethod(contentElement, pdfOptions);
            
            // Success!
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(100, 'PDF completed!');
                setTimeout(() => PDFLibraryManager.hidePDFProgress(), 1500);
            }
            
            this.addDebugInfo('✅ PDF generated successfully!');
            this.showDebugPopup('PDF generation completed successfully!');
            
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('PDF downloaded successfully', 'success');
            }
            
        } catch (error) {
            this.addDebugInfo(`❌ Error: ${error.message}`);
            
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.hidePDFProgress();
            }
            
            this.showDebugPopup(`PDF generation failed: ${error.message}`);
            
        } finally {
            this.state.generatingPDF = false;
        }
    },
    
    /**
     * Find content with extensive debug info
     */
    findContentForPDFWithDebug: function() {
        this.addDebugInfo('🔍 Looking for content...');
        
        for (let i = 0; i < this.config.contentSelectors.length; i++) {
            const selector = this.config.contentSelectors[i];
            const element = document.querySelector(selector);
            
            this.addDebugInfo(`Trying selector ${i + 1}/${this.config.contentSelectors.length}: ${selector}`);
            
            if (element) {
                const htmlLength = element.innerHTML ? element.innerHTML.trim().length : 0;
                const textLength = element.textContent ? element.textContent.trim().length : 0;
                const width = element.offsetWidth || 0;
                const height = element.offsetHeight || 0;
                
                this.addDebugInfo(`  ✓ Element found: ${width}x${height}px`);
                this.addDebugInfo(`  ✓ HTML length: ${htmlLength} chars`);
                this.addDebugInfo(`  ✓ Text length: ${textLength} chars`);
                
                if (htmlLength > 0 && textLength > 0) {
                    const preview = element.textContent.substring(0, 100).replace(/\s+/g, ' ');
                    this.addDebugInfo(`  ✓ Content preview: "${preview}..."`);
                    this.addDebugInfo(`✅ Using content from: ${selector}`);
                    return element;
                } else {
                    this.addDebugInfo(`  ⚠️ Element is empty`);
                }
            } else {
                this.addDebugInfo(`  ❌ Element not found`);
            }
        }
        
        this.addDebugInfo('❌ No suitable content element found');
        return null;
    },
    
    /**
     * Generate PDF using DIRECT method - no temp containers
     */
    generatePDFDirectMethod: async function(contentElement, options) {
        this.addDebugInfo('📄 Using DIRECT PDF generation method');
        
        // Check libraries
        this.addDebugInfo('🔧 Checking PDF libraries...');
        
        if (typeof window.html2pdf === 'undefined') {
            this.addDebugInfo('⏳ Loading html2pdf...');
            if (typeof PDFLibraryManager !== 'undefined') {
                await PDFLibraryManager.loadHtml2PDF();
                this.addDebugInfo('✅ html2pdf loaded');
            } else {
                throw new Error('PDFLibraryManager not available');
            }
        } else {
            this.addDebugInfo('✅ html2pdf already available');
        }
        
        // Update progress
        if (typeof PDFLibraryManager !== 'undefined') {
            PDFLibraryManager.updatePDFProgress(50, 'Processing content directly...');
        }
        
        // Add temporary PDF styles directly to the page
        this.addTemporaryPDFStyles();
        
        try {
            this.addDebugInfo('🎨 Added temporary PDF styles');
            
            // Wait a moment for styles to apply
            await Utils.sleep(1000);
            
            // Get element dimensions
            const elementWidth = Math.max(contentElement.scrollWidth, contentElement.offsetWidth, 800);
            const elementHeight = Math.max(contentElement.scrollHeight, contentElement.offsetHeight, 600);
            
            this.addDebugInfo(`📐 Element dimensions: ${elementWidth}x${elementHeight}`);
            
            // Configure html2pdf with DIRECT settings
            const html2pdfOptions = {
                margin: options.margin,
                filename: options.filename,
                image: options.image,
                html2canvas: {
                    scale: 1,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    width: elementWidth,
                    height: elementHeight,
                    logging: false
                },
                jsPDF: options.jsPDF
            };
            
            this.addDebugInfo('⚙️ Configured html2pdf options');
            
            // Update progress
            if (typeof PDFLibraryManager !== 'undefined') {
                PDFLibraryManager.updatePDFProgress(70, 'Generating PDF from content...');
            }
            
            this.addDebugInfo('🖨️ Starting html2pdf generation...');
            
            // Generate PDF DIRECTLY from the visible element
            await window.html2pdf()
                .set(html2pdfOptions)
                .from(contentElement) // Use element DIRECTLY
                .toPdf()
                .save();
            
            this.addDebugInfo('✅ html2pdf completed successfully');
            
        } finally {
            // Remove temporary styles
            this.removeTemporaryPDFStyles();
            this.addDebugInfo('🧹 Cleaned up temporary styles');
        }
    },
    
    /**
     * Add temporary PDF styles to current page
     */
    addTemporaryPDFStyles: function() {
        // Remove any existing temporary styles
        this.removeTemporaryPDFStyles();
        
        const tempStyles = document.createElement('style');
        tempStyles.id = 'temp-pdf-styles';
        tempStyles.textContent = `
            /* Temporary styles for PDF generation */
            .copy-code-btn, 
            .heading-anchor, 
            .file-actions, 
            .file-navigation,
            .pdf-readiness-indicator,
            .pdf-btn,
            .pdf-options-btn,
            button {
                display: none !important;
            }
            
            /* Ensure content is visible */
            #main-content,
            .file-content,
            .markdown-content,
            .code-content,
            .data-content,
            .text-content {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                color: #000 !important;
            }
            
            /* Make sure text is black */
            * {
                color: #000 !important;
            }
            
            /* Style headings */
            h1, h2, h3, h4, h5, h6 {
                color: #000 !important;
                font-weight: bold !important;
                margin-top: 1rem !important;
                margin-bottom: 0.5rem !important;
            }
            
            /* Style paragraphs */
            p {
                color: #000 !important;
                margin-bottom: 1rem !important;
                line-height: 1.6 !important;
            }
            
            /* Style code blocks */
            pre, code {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                padding: 0.5rem !important;
                border-radius: 4px !important;
                color: #000 !important;
                font-family: monospace !important;
            }
            
            /* Style lists */
            ul, ol {
                color: #000 !important;
                margin: 1rem 0 !important;
                padding-left: 2rem !important;
            }
            
            li {
                color: #000 !important;
                margin-bottom: 0.25rem !important;
            }
            
            /* Style tables */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 1rem 0 !important;
            }
            
            th, td {
                border: 1px solid #ddd !important;
                padding: 0.5rem !important;
                color: #000 !important;
                text-align: left !important;
            }
            
            th {
                background: #f0f0f0 !important;
                font-weight: bold !important;
            }
            
            /* Style images */
            img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 1rem 0 !important;
            }
        `;
        
        document.head.appendChild(tempStyles);
    },
    
    /**
     * Remove temporary PDF styles
     */
    removeTemporaryPDFStyles: function() {
        const tempStyles = document.getElementById('temp-pdf-styles');
        if (tempStyles) {
            tempStyles.remove();
        }
    },
    
    /**
     * Add debug info to internal list
     */
    addDebugInfo: function(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.state.debugInfo.push(`[${timestamp}] ${message}`);
        
        // Keep only last 20 messages to avoid memory issues
        if (this.state.debugInfo.length > 20) {
            this.state.debugInfo = this.state.debugInfo.slice(-20);
        }
    },
    
    /**
     * Show debug popup with all info - TABLET FRIENDLY
     */
    showDebugPopup: function(title) {
        // Remove any existing debug popup
        const existingPopup = document.getElementById('pdf-debug-popup');
        if (existingPopup) {
            existingPopup.remove();
        }
        
        const popup = document.createElement('div');
        popup.id = 'pdf-debug-popup';
        popup.style.cssText = `
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 600px;
            max-height: 70%;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 1rem;
            border-radius: 12px;
            z-index: 100000;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            font-family: monospace;
            font-size: 12px;
            line-height: 1.4;
        `;
        
        const debugText = this.state.debugInfo.join('\n');
        
        popup.innerHTML = `
            <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #444;">
                <h3 style="color: #ff6b6b; margin: 0 0 0.5rem 0; font-size: 16px;">${title}</h3>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            style="background: #4ecdc4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        ✓ OK
                    </button>
                    <button onclick="PDFGenerator.copyDebugInfo()" 
                            style="background: #45b7d1; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        📋 Copy Info
                    </button>
                    <button onclick="PDFGenerator.generateAdvancedPDF()" 
                            style="background: #96ceb4; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        🔄 Try Again
                    </button>
                </div>
            </div>
            <div style="background: #1a1a1a; padding: 1rem; border-radius: 6px; white-space: pre-wrap; word-wrap: break-word;">
${debugText}
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Auto-remove after 30 seconds to prevent cluttering
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 30000);
    },
    
    /**
     * Copy debug info to clipboard
     */
    copyDebugInfo: function() {
        const debugText = this.state.debugInfo.join('\n');
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(debugText).then(() => {
                alert('Debug info copied to clipboard!');
            }).catch(() => {
                alert('Could not copy to clipboard');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = debugText;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Debug info copied to clipboard!');
            } catch (err) {
                alert('Could not copy to clipboard');
            }
            document.body.removeChild(textArea);
        }
    },
    
    /**
     * Build PDF options from defaults and user options
     */
    buildPDFOptions: function(fileName, userOptions = {}) {
        const defaultOptions = this.config.defaultOptions;
        
        return {
            margin: userOptions.margin || defaultOptions.margin,
            filename: `${Utils ? Utils.filenameToDisplayName(fileName.replace(/\.[^/.]+$/, '')) : fileName}.pdf`,
            image: { ...defaultOptions.image, ...userOptions.image },
            html2canvas: { 
                ...defaultOptions.html2canvas,
                ...userOptions.html2canvas
            },
            jsPDF: { 
                ...defaultOptions.jsPDF,
                orientation: userOptions.orientation || defaultOptions.jsPDF.orientation
            }
        };
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
            debugInfo: this.state.debugInfo,
            lastDebugCount: this.state.debugInfo.length
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFGenerator (Tablet Debug Version) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}
