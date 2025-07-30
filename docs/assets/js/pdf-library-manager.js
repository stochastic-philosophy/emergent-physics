/**
 * PDF Library Manager - PDF Libraries and UI Management
 * Handles loading of PDF libraries, progress indicators, and error handling
 */

window.PDFLibraryManager = {
    
    // Library loading state
    state: {
        html2pdfLoaded: false,
        html2canvasLoaded: false,
        jsPDFLoaded: false,
        loadingPromises: {},
        progressElement: null
    },
    
    // Configuration
    config: {
        libraries: {
            html2pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
        },
        progressConfig: {
            containerClass: 'pdf-progress',
            minDisplayTime: 1000 // Minimum time to show progress (ms)
        }
    },
    
    /**
     * Load html2pdf.js library
     */
    loadHtml2PDF: async function() {
        if (this.state.html2pdfLoaded || typeof window.html2pdf !== 'undefined') {
            this.state.html2pdfLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.html2pdf) {
            return this.state.loadingPromises.html2pdf;
        }
        
        this.state.loadingPromises.html2pdf = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.config.libraries.html2pdf;
            script.onload = () => {
                this.state.html2pdfLoaded = true;
                DEBUG.success('html2pdf.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load html2pdf.js');
                reject(new Error('Failed to load html2pdf.js'));
            };
            document.head.appendChild(script);
        });
        
        return this.state.loadingPromises.html2pdf;
    },
    
    /**
     * Load html2canvas library (fallback)
     */
    loadHtml2Canvas: async function() {
        if (this.state.html2canvasLoaded || typeof window.html2canvas !== 'undefined') {
            this.state.html2canvasLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.html2canvas) {
            return this.state.loadingPromises.html2canvas;
        }
        
        this.state.loadingPromises.html2canvas = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.config.libraries.html2canvas;
            script.onload = () => {
                this.state.html2canvasLoaded = true;
                DEBUG.success('html2canvas loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load html2canvas');
                reject(new Error('Failed to load html2canvas'));
            };
            document.head.appendChild(script);
        });
        
        return this.state.loadingPromises.html2canvas;
    },
    
    /**
     * Load jsPDF library (fallback)
     */
    loadJsPDF: async function() {
        if (this.state.jsPDFLoaded || typeof window.jsPDF !== 'undefined') {
            this.state.jsPDFLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.jspdf) {
            return this.state.loadingPromises.jspdf;
        }
        
        this.state.loadingPromises.jspdf = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.config.libraries.jspdf;
            script.onload = () => {
                this.state.jsPDFLoaded = true;
                DEBUG.success('jsPDF loaded successfully');
                resolve();
            };
            script.onerror = () => {
                DEBUG.error('Failed to load jsPDF');
                reject(new Error('Failed to load jsPDF'));
            };
            document.head.appendChild(script);
        });
        
        return this.state.loadingPromises.jspdf;
    },
    
    /**
     * Show PDF progress indicator
     */
    showPDFProgress: function(message = 'Generating PDF...', progress = 0) {
        this.hidePDFProgress(); // Remove any existing progress
        
        const currentLang = UI.getCurrentLanguage();
        const progressContainer = document.createElement('div');
        progressContainer.id = 'pdf-progress-container';
        progressContainer.className = this.config.progressConfig.containerClass;
        
        // Create progress HTML
        progressContainer.innerHTML = `
            <div class="pdf-progress-content">
                <h3 id="pdf-progress-title">${message}</h3>
                <div class="pdf-progress-bar">
                    <div class="pdf-progress-fill" style="width: ${progress}%"></div>
                </div>
                <p id="pdf-progress-text">${progress}%</p>
                <small>${currentLang === 'fi' ? 'Tämä voi kestää hetken...' : 'This may take a moment...'}</small>
            </div>
        `;
        
        // Apply styles
        progressContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            z-index: 10000;
            min-width: 300px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        `;
        
        // Style the progress bar
        const progressBarStyles = `
            <style id="pdf-progress-styles">
                .pdf-progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #374151;
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 1rem 0;
                }
                
                .pdf-progress-fill {
                    height: 100%;
                    background: #dc2626;
                    transition: width 0.3s ease;
                    border-radius: 4px;
                }
                
                .pdf-progress-content h3 {
                    margin: 0 0 1rem 0;
                    color: white;
                }
                
                .pdf-progress-content p {
                    margin: 0.5rem 0;
                    font-weight: bold;
                }
                
                .pdf-progress-content small {
                    opacity: 0.8;
                }
            </style>
        `;
        
        // Add styles if not already present
        if (!document.getElementById('pdf-progress-styles')) {
            document.head.insertAdjacentHTML('beforeend', progressBarStyles);
        }
        
        document.body.appendChild(progressContainer);
        this.state.progressElement = progressContainer;
        
        DEBUG.info(`PDF progress shown: ${message} (${progress}%)`);
    },
    
    /**
     * Update PDF progress
     */
    updatePDFProgress: function(progress, message = null) {
        if (!this.state.progressElement) {
            DEBUG.warn('No progress element to update');
            return;
        }
        
        const fillElement = this.state.progressElement.querySelector('.pdf-progress-fill');
        const textElement = this.state.progressElement.querySelector('#pdf-progress-text');
        const titleElement = this.state.progressElement.querySelector('#pdf-progress-title');
        
        if (fillElement) {
            fillElement.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        if (textElement) {
            textElement.textContent = `${Math.round(progress)}%`;
        }
        
        if (message && titleElement) {
            titleElement.textContent = message;
        }
        
        DEBUG.info(`PDF progress updated: ${progress}%${message ? ` - ${message}` : ''}`);
    },
    
    /**
     * Hide PDF progress indicator
     */
    hidePDFProgress: function() {
        if (this.state.progressElement) {
            try {
                // Smooth fade-out animation
                this.state.progressElement.style.opacity = '0';
                this.state.progressElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
                this.state.progressElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                
                setTimeout(() => {
                    if (this.state.progressElement && this.state.progressElement.parentNode) {
                        this.state.progressElement.parentNode.removeChild(this.state.progressElement);
                    }
                    this.state.progressElement = null;
                }, 300);
                
                DEBUG.info('PDF progress hidden');
            } catch (error) {
                DEBUG.warn('Error hiding PDF progress:', error);
                this.state.progressElement = null;
            }
        }
        
        // Remove progress styles if no longer needed
        const existingStyles = document.getElementById('pdf-progress-styles');
        if (existingStyles && !document.querySelector('.pdf-progress')) {
            existingStyles.remove();
        }
    },
    
    /**
     * Show PDF error dialog
     */
    showPDFError: function(errorMessage, details = null) {
        this.hidePDFProgress(); // Hide progress first
        
        const currentLang = UI.getCurrentLanguage();
        const errorContainer = document.createElement('div');
        errorContainer.id = 'pdf-error-container';
        
        errorContainer.innerHTML = `
            <div class="pdf-error-content">
                <h3>${currentLang === 'fi' ? '❌ PDF-generointi epäonnistui' : '❌ PDF Generation Failed'}</h3>
                <p class="error-message">${Utils.escapeHtml(errorMessage)}</p>
                ${details ? `<details><summary>${currentLang === 'fi' ? 'Teknisiä tietoja' : 'Technical Details'}</summary><pre>${Utils.escapeHtml(details)}</pre></details>` : ''}
                <div class="error-actions">
                    <button onclick="PDFLibraryManager.hidePDFError()" class="error-ok-btn">
                        ${currentLang === 'fi' ? 'OK' : 'OK'}
                    </button>
                    <button onclick="PDFLibraryManager.retryPDF()" class="error-retry-btn">
                        ${currentLang === 'fi' ? 'Yritä uudelleen' : 'Retry'}
                    </button>
                </div>
            </div>
        `;
        
        // Apply styles
        errorContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(220, 38, 38, 0.95);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            z-index: 10001;
            min-width: 350px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
        `;
        
        // Add error dialog styles
        const errorStyles = `
            <style id="pdf-error-styles">
                .pdf-error-content h3 {
                    margin: 0 0 1rem 0;
                    color: white;
                }
                
                .pdf-error-content .error-message {
                    margin: 1rem 0;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 6px;
                    font-family: monospace;
                }
                
                .pdf-error-content details {
                    margin: 1rem 0;
                    text-align: left;
                }
                
                .pdf-error-content pre {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 0.5rem;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-size: 0.8rem;
                }
                
                .error-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 1.5rem;
                }
                
                .error-ok-btn, .error-retry-btn {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                }
                
                .error-ok-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }
                
                .error-retry-btn {
                    background: white;
                    color: #dc2626;
                }
                
                .error-ok-btn:hover, .error-retry-btn:hover {
                    opacity: 0.8;
                }
            </style>
        `;
        
        if (!document.getElementById('pdf-error-styles')) {
            document.head.insertAdjacentHTML('beforeend', errorStyles);
        }
        
        document.body.appendChild(errorContainer);
        this.state.errorElement = errorContainer;
        
        DEBUG.error(`PDF error dialog shown: ${errorMessage}`);
    },
    
    /**
     * Hide PDF error dialog
     */
    hidePDFError: function() {
        if (this.state.errorElement) {
            this.state.errorElement.remove();
            this.state.errorElement = null;
        }
        
        const errorContainer = document.getElementById('pdf-error-container');
        if (errorContainer) {
            errorContainer.remove();
        }
        
        // Remove error styles if no longer needed
        const errorStyles = document.getElementById('pdf-error-styles');
        if (errorStyles && !document.querySelector('#pdf-error-container')) {
            errorStyles.remove();
        }
    },
    
    /**
     * Retry PDF generation
     */
    retryPDF: function() {
        this.hidePDFError();
        
        if (typeof PDFGenerator !== 'undefined' && PDFGenerator.generateAdvancedPDF) {
            DEBUG.info('Retrying PDF generation...');
            PDFGenerator.generateAdvancedPDF().catch(error => {
                this.showPDFError('PDF generation failed again', error.message);
            });
        } else {
            DEBUG.error('PDFGenerator not available for retry');
        }
    },
    
    /**
     * Get library loading status
     */
    getLibraryStatus: function() {
        return {
            html2pdf: this.state.html2pdfLoaded,
            html2canvas: this.state.html2canvasLoaded,
            jspdf: this.state.jsPDFLoaded,
            allLoaded: this.state.html2pdfLoaded && this.state.html2canvasLoaded && this.state.jsPDFLoaded
        };
    },
    
    /**
     * Preload all PDF libraries
     */
    preloadLibraries: async function() {
        DEBUG.info('Preloading PDF libraries...');
        
        try {
            await Promise.all([
                this.loadHtml2PDF(),
                this.loadHtml2Canvas(),
                this.loadJsPDF()
            ]);
            
            DEBUG.success('All PDF libraries preloaded successfully');
            return true;
        } catch (error) {
            DEBUG.error('Failed to preload PDF libraries:', error);
            return false;
        }
    },
    
    /**
     * Test library availability
     */
    testLibraries: function() {
        const tests = {
            html2pdf: typeof window.html2pdf !== 'undefined',
            html2canvas: typeof window.html2canvas !== 'undefined',
            jspdf: typeof window.jsPDF !== 'undefined'
        };
        
        DEBUG.info('PDF Library Test Results:', tests);
        return tests;
    },
    
    /**
     * Reset library manager state
     */
    reset: function() {
        this.hidePDFProgress();
        this.hidePDFError();
        
        // Reset loading state but keep libraries loaded
        this.state.progressElement = null;
        this.state.errorElement = null;
        
        DEBUG.info('PDF Library Manager reset');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFLibraryManager module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFLibraryManager;
}
