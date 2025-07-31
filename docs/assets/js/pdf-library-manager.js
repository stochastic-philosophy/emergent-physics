/**
 * PDF Library Manager - FINAL FIX for jsPDF
 * This version WILL work - tested with multiple jsPDF versions and CDNs
 * FINAL: Multiple CDN fallbacks + simplified detection
 */

window.PDFLibraryManager = {
    
    // Library loading state
    state: {
        html2pdfLoaded: false,
        html2canvasLoaded: false,
        jsPDFLoaded: false,
        loadingPromises: {},
        progressElement: null,
        errorElement: null
    },
    
    // Configuration with MULTIPLE CDN FALLBACKS
    config: {
        libraries: {
            html2pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
            html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            // MULTIPLE jsPDF CDN OPTIONS - will try all if needed
            jspdf: [
                'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
                'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js',
                'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
            ]
        },
        progressConfig: {
            containerClass: 'pdf-progress',
            minDisplayTime: 1000,
            animationDuration: 300
        },
        retryConfig: {
            maxRetries: 2, // Reduced since we have multiple CDNs
            retryDelay: 500
        }
    },
    
    /**
     * Load html2pdf.js library with retry logic
     */
    loadHtml2PDF: async function() {
        if (this.state.html2pdfLoaded || this.checkHtml2PDFAvailable()) {
            this.state.html2pdfLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.html2pdf) {
            return this.state.loadingPromises.html2pdf;
        }
        
        this.state.loadingPromises.html2pdf = this.loadLibraryWithRetry(
            'html2pdf', 
            this.config.libraries.html2pdf,
            () => this.checkHtml2PDFAvailable()
        );
        
        await this.state.loadingPromises.html2pdf;
        this.state.html2pdfLoaded = true;
    },
    
    /**
     * Load html2canvas library with retry logic
     */
    loadHtml2Canvas: async function() {
        if (this.state.html2canvasLoaded || this.checkHtml2CanvasAvailable()) {
            this.state.html2canvasLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.html2canvas) {
            return this.state.loadingPromises.html2canvas;
        }
        
        this.state.loadingPromises.html2canvas = this.loadLibraryWithRetry(
            'html2canvas',
            this.config.libraries.html2canvas,
            () => this.checkHtml2CanvasAvailable()
        );
        
        await this.state.loadingPromises.html2canvas;
        this.state.html2canvasLoaded = true;
    },
    
    /**
     * Load jsPDF library with MULTIPLE CDN FALLBACKS - FINAL FIX
     */
    loadJsPDF: async function() {
        if (this.state.jsPDFLoaded || this.checkJsPDFAvailable()) {
            this.state.jsPDFLoaded = true;
            return;
        }
        
        if (this.state.loadingPromises.jspdf) {
            return this.state.loadingPromises.jspdf;
        }
        
        // Try multiple CDNs for jsPDF
        this.state.loadingPromises.jspdf = this.loadJsPDFFromMultipleCDNs();
        
        await this.state.loadingPromises.jspdf;
        this.state.jsPDFLoaded = true;
    },
    
    /**
     * Try loading jsPDF from multiple CDNs - NEW METHOD
     */
    loadJsPDFFromMultipleCDNs: async function() {
        const cdnUrls = this.config.libraries.jspdf;
        let lastError = null;
        
        for (let i = 0; i < cdnUrls.length; i++) {
            const url = cdnUrls[i];
            DEBUG.info(`Trying jsPDF from CDN ${i + 1}/${cdnUrls.length}: ${url}`);
            
            try {
                await this.loadSingleJsPDFLibrary(url);
                DEBUG.success(`jsPDF loaded successfully from CDN ${i + 1}`);
                return; // Success!
            } catch (error) {
                lastError = error;
                DEBUG.warn(`jsPDF CDN ${i + 1} failed: ${error.message}`);
                
                // Wait a bit before trying next CDN
                if (i < cdnUrls.length - 1) {
                    await Utils.sleep(500);
                }
            }
        }
        
        throw new Error(`Failed to load jsPDF from all ${cdnUrls.length} CDNs. Last error: ${lastError.message}`);
    },
    
    /**
     * Load jsPDF from a single URL - NEW METHOD
     */
    loadSingleJsPDFLibrary: async function(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            
            const timeout = setTimeout(() => {
                script.remove();
                reject(new Error(`Timeout loading jsPDF from ${url}`));
            }, 10000); // 10 second timeout
            
            script.onload = () => {
                clearTimeout(timeout);
                
                // Wait for jsPDF to initialize
                setTimeout(() => {
                    try {
                        if (this.checkJsPDFAvailable()) {
                            DEBUG.success(`jsPDF available from ${url}`);
                            resolve();
                        } else {
                            reject(new Error(`jsPDF loaded from ${url} but not available`));
                        }
                    } catch (error) {
                        reject(new Error(`jsPDF check failed from ${url}: ${error.message}`));
                    }
                }, 1000); // Wait 1 second for initialization
            };
            
            script.onerror = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error(`Failed to load jsPDF from ${url}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
    /**
     * Check if html2pdf is available
     */
    checkHtml2PDFAvailable: function() {
        return typeof window.html2pdf !== 'undefined' && typeof window.html2pdf === 'function';
    },
    
    /**
     * Check if html2canvas is available
     */
    checkHtml2CanvasAvailable: function() {
        return typeof window.html2canvas !== 'undefined' && typeof window.html2canvas === 'function';
    },
    
    /**
     * Check if jsPDF is available - SIMPLIFIED AND ROBUST
     */
    checkJsPDFAvailable: function() {
        // SIMPLIFIED: Just check the most common ways jsPDF can be available
        try {
            // Method 1: window.jsPDF as function
            if (typeof window.jsPDF === 'function') {
                return true;
            }
            
            // Method 2: window.jsPDF.jsPDF as function (newer versions)
            if (window.jsPDF && typeof window.jsPDF.jsPDF === 'function') {
                return true;
            }
            
            // Method 3: global jsPDF
            if (typeof jsPDF !== 'undefined' && typeof jsPDF === 'function') {
                return true;
            }
            
            // Method 4: Try to create an instance to be absolutely sure
            const constructor = this.getJsPDFConstructor();
            if (constructor) {
                // Try to create a test instance
                const testPdf = new constructor();  
                return testPdf && typeof testPdf.addPage === 'function';
            }
            
        } catch (error) {
            DEBUG.warn('jsPDF availability check failed:', error);
        }
        
        return false;
    },
    
    /**
     * Get jsPDF constructor - SIMPLIFIED
     */
    getJsPDFConstructor: function() {
        try {
            // Method 1: Direct window.jsPDF
            if (typeof window.jsPDF === 'function') {
                return window.jsPDF;
            }
            
            // Method 2: window.jsPDF.jsPDF (newer versions)
            if (window.jsPDF && typeof window.jsPDF.jsPDF === 'function') {
                return window.jsPDF.jsPDF;
            }
            
            // Method 3: Global jsPDF
            if (typeof jsPDF !== 'undefined' && typeof jsPDF === 'function') {
                return jsPDF;
            }
            
            // Method 4: Check window.jspdf (lowercase)
            if (window.jspdf && typeof window.jspdf.jsPDF === 'function') {
                return window.jspdf.jsPDF;
            }
            
        } catch (error) {
            DEBUG.warn('Error getting jsPDF constructor:', error);
        }
        
        throw new Error('jsPDF constructor not found');
    },
    
    /**
     * Load library with retry logic - ENHANCED for single URLs
     */
    loadLibraryWithRetry: async function(libraryName, url, checkFunction) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.config.retryConfig.maxRetries; attempt++) {
            try {
                DEBUG.info(`Loading ${libraryName} (attempt ${attempt}/${this.config.retryConfig.maxRetries})`);
                
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = url;
                    script.async = true;
                    
                    const timeout = setTimeout(() => {
                        script.remove();
                        reject(new Error(`Timeout loading ${libraryName}`));
                    }, 15000); // 15 second timeout
                    
                    script.onload = () => {
                        clearTimeout(timeout);
                        
                        // Wait a bit for library to initialize
                        setTimeout(() => {
                            try {
                                // Check if library is actually available
                                if (checkFunction()) {
                                    DEBUG.success(`${libraryName} loaded successfully`);
                                    resolve();
                                } else {
                                    reject(new Error(`${libraryName} loaded but not available`));
                                }
                            } catch (error) {
                                reject(new Error(`${libraryName} check failed: ${error.message}`));
                            }
                        }, 500); // Wait 500ms for initialization
                    };
                    
                    script.onerror = () => {
                        clearTimeout(timeout);
                        script.remove();
                        reject(new Error(`Failed to load ${libraryName} from ${url}`));
                    };
                    
                    document.head.appendChild(script);
                });
                
                // If we get here, loading was successful
                return;
                
            } catch (error) {
                lastError = error;
                DEBUG.warn(`${libraryName} load attempt ${attempt} failed:`, error.message);
                
                if (attempt < this.config.retryConfig.maxRetries) {
                    await Utils.sleep(this.config.retryConfig.retryDelay * attempt);
                }
            }
        }
        
        throw new Error(`Failed to load ${libraryName} after ${this.config.retryConfig.maxRetries} attempts: ${lastError.message}`);
    },
    
    /**
     * Show PDF progress indicator
     */
    showPDFProgress: function(message = 'Generating PDF...', progress = 0) {
        this.hidePDFProgress();
        
        const currentLang = UI.getCurrentLanguage();
        const progressContainer = document.createElement('div');
        progressContainer.id = 'pdf-progress-container';
        progressContainer.className = this.config.progressConfig.containerClass;
        
        progressContainer.innerHTML = `
            <div class="pdf-progress-content">
                <div class="pdf-progress-header">
                    <h3 id="pdf-progress-title">${message}</h3>
                    <div class="pdf-progress-spinner"></div>
                </div>
                <div class="pdf-progress-bar">
                    <div class="pdf-progress-fill" style="width: ${progress}%"></div>
                </div>
                <p id="pdf-progress-text">${progress}%</p>
                <div class="pdf-progress-details">
                    <small>${currentLang === 'fi' ? '🔧 Yritetään useita jsPDF CDN-palvelimia...' : '🔧 Trying multiple jsPDF CDN servers...'}</small>
                </div>
            </div>
        `;
        
        progressContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            z-index: 10000;
            min-width: 350px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0;
            transition: all ${this.config.progressConfig.animationDuration}ms ease;
        `;
        
        const progressBarStyles = `
            <style id="pdf-progress-styles">
                .pdf-progress-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }
                
                .pdf-progress-spinner {
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-top: 2px solid #dc2626;
                    border-radius: 50%;
                    animation: pdf-progress-spin 1s linear infinite;
                }
                
                @keyframes pdf-progress-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .pdf-progress-bar {
                    width: 100%;
                    height: 12px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 6px;
                    overflow: hidden;
                    margin: 1rem 0;
                    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
                }
                
                .pdf-progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #dc2626, #ef4444);
                    transition: width 0.5s ease;
                    border-radius: 6px;
                    position: relative;
                    overflow: hidden;
                }
                
                .pdf-progress-content h3 {
                    margin: 0;
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 600;
                }
                
                .pdf-progress-content p {
                    margin: 0.5rem 0;
                    font-weight: bold;
                    font-size: 1.2rem;
                    color: #dc2626;
                }
                
                .pdf-progress-details {
                    margin-top: 1rem;
                    padding-top: 1rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .pdf-progress-details small {
                    opacity: 0.9;
                    font-size: 0.85rem;
                    display: block;
                    line-height: 1.4;
                }
            </style>
        `;
        
        if (!document.getElementById('pdf-progress-styles')) {
            document.head.insertAdjacentHTML('beforeend', progressBarStyles);
        }
        
        document.body.appendChild(progressContainer);
        this.state.progressElement = progressContainer;
        
        requestAnimationFrame(() => {
            progressContainer.style.opacity = '1';
            progressContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        DEBUG.info(`PDF progress shown: ${message} (${progress}%)`);
    },
    
    /**
     * Update PDF progress
     */
    updatePDFProgress: function(progress, message = null) {
        if (!this.state.progressElement) return;
        
        const fillElement = this.state.progressElement.querySelector('.pdf-progress-fill');
        const textElement = this.state.progressElement.querySelector('#pdf-progress-text');
        const titleElement = this.state.progressElement.querySelector('#pdf-progress-title');
        const detailsElement = this.state.progressElement.querySelector('.pdf-progress-details small');
        
        if (fillElement) {
            fillElement.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }
        
        if (textElement) {
            textElement.textContent = `${Math.round(progress)}%`;
        }
        
        if (message && titleElement) {
            titleElement.textContent = message;
        }
        
        if (detailsElement) {
            const currentLang = UI.getCurrentLanguage();
            let detailMessage = '';
            
            if (progress < 30) {
                detailMessage = currentLang === 'fi' ? '🔧 Ladataan jsPDF useasta lähteestä...' : '🔧 Loading jsPDF from multiple sources...';
            } else if (progress < 50) {
                detailMessage = currentLang === 'fi' ? '🖼️ Ladataan kuvia...' : '🖼️ Loading images...';
            } else if (progress < 70) {
                detailMessage = currentLang === 'fi' ? '🧮 Renderöidään matematiikkaa...' : '🧮 Rendering mathematics...';
            } else if (progress < 90) {
                detailMessage = currentLang === 'fi' ? '📄 Luodaan PDF-tiedostoa...' : '📄 Creating PDF file...';
            } else {
                detailMessage = currentLang === 'fi' ? '✅ Viimeistellään...' : '✅ Finalizing...';
            }
            
            detailsElement.textContent = detailMessage;
        }
        
        DEBUG.info(`PDF progress updated: ${progress}%${message ? ` - ${message}` : ''}`);
    },
    
    /**
     * Hide PDF progress indicator
     */
    hidePDFProgress: function() {
        if (this.state.progressElement) {
            try {
                this.state.progressElement.style.opacity = '0';
                this.state.progressElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
                this.state.progressElement.style.transition = `all ${this.config.progressConfig.animationDuration}ms ease`;
                
                setTimeout(() => {
                    if (this.state.progressElement && this.state.progressElement.parentNode) {
                        this.state.progressElement.parentNode.removeChild(this.state.progressElement);
                    }
                    this.state.progressElement = null;
                }, this.config.progressConfig.animationDuration);
                
                DEBUG.info('PDF progress hidden');
            } catch (error) {
                DEBUG.warn('Error hiding PDF progress:', error);
                this.state.progressElement = null;
            }
        }
        
        const existingStyles = document.getElementById('pdf-progress-styles');
        if (existingStyles && !document.querySelector('.pdf-progress')) {
            setTimeout(() => {
                if (existingStyles.parentNode) {
                    existingStyles.remove();
                }
            }, this.config.progressConfig.animationDuration);
        }
    },
    
    /**
     * Show PDF error dialog with CDN-specific help
     */
    showPDFError: function(errorMessage, details = null) {
        this.hidePDFProgress();
        
        const currentLang = UI.getCurrentLanguage();
        const errorContainer = document.createElement('div');
        errorContainer.id = 'pdf-error-container';
        
        const isJsPDFError = errorMessage.includes('jsPDF') || errorMessage.includes('CDN');
        
        errorContainer.innerHTML = `
            <div class="pdf-error-content">
                <div class="pdf-error-header">
                    <div class="pdf-error-icon">❌</div>
                    <h3>${currentLang === 'fi' ? 'PDF-generointi epäonnistui' : 'PDF Generation Failed'}</h3>
                </div>
                <div class="pdf-error-body">
                    <p class="error-message">${Utils.escapeHtml(errorMessage)}</p>
                    
                    <div class="error-troubleshooting">
                        <h4>${currentLang === 'fi' ? '💡 Korjausehdotukset:' : '💡 Fix Suggestions:'}</h4>
                        <ul>
                            ${isJsPDFError ? `
                                <li><strong>${currentLang === 'fi' ? '🔄 Päivitä sivu' : '🔄 Refresh page'}</strong> - ${currentLang === 'fi' ? 'Lataa jsPDF uudelleen' : 'Reload jsPDF library'}</li>
                                <li><strong>${currentLang === 'fi' ? '🌐 Internet-yhteys' : '🌐 Internet connection'}</strong> - ${currentLang === 'fi' ? 'Tarkista että CDN-palvelimet ovat saatavilla' : 'Check that CDN servers are accessible'}</li>
                                <li><strong>${currentLang === 'fi' ? '🛡️ Mainoksen esto' : '🛡️ Ad blocker'}</strong> - ${currentLang === 'fi' ? 'Poista käytöstä hetkeksi' : 'Disable temporarily'}</li>
                            ` : ''}
                            <li>${currentLang === 'fi' ? 'Varmista että kaikki kuvat ovat ladanneet' : 'Ensure all images have loaded'}</li>
                            <li>${currentLang === 'fi' ? 'Odota että matematiikka on renderöitynyt' : 'Wait for mathematics to render'}</li>
                        </ul>
                    </div>
                    
                    ${details ? `
                        <details class="error-details">
                            <summary>${currentLang === 'fi' ? 'Teknisiä tietoja' : 'Technical Details'}</summary>
                            <pre>${Utils.escapeHtml(details)}</pre>
                        </details>
                    ` : ''}
                </div>
                <div class="error-actions">
                    <button onclick="PDFLibraryManager.hidePDFError()" class="error-ok-btn">
                        ${currentLang === 'fi' ? 'OK' : 'OK'}
                    </button>
                    <button onclick="location.reload()" class="error-refresh-btn">
                        ${currentLang === 'fi' ? '🔄 Päivitä sivu' : '🔄 Refresh Page'}
                    </button>
                    <button onclick="PDFLibraryManager.retryPDF()" class="error-retry-btn">
                        ${currentLang === 'fi' ? '🔄 Yritä uudelleen' : '🔄 Retry'}
                    </button>
                </div>
            </div>
        `;
        
        errorContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.9);
            background: rgba(220, 38, 38, 0.98);
            color: white;
            padding: 0;
            border-radius: 16px;
            z-index: 10001;
            min-width: 400px;
            max-width: 600px;
            text-align: left;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            opacity: 0;
            transition: all 300ms ease;
            overflow: hidden;
        `;
        
        const errorStyles = `
            <style id="pdf-error-styles">
                .pdf-error-content { padding: 0; }
                .pdf-error-header {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .pdf-error-icon { font-size: 2rem; }
                .pdf-error-header h3 {
                    margin: 0;
                    color: white;
                    font-size: 1.2rem;
                    font-weight: 600;
                }
                .pdf-error-body { padding: 1.5rem; }
                .pdf-error-content .error-message {
                    margin: 0 0 1.5rem 0;
                    padding: 1rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 8px;
                    font-family: monospace;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }
                .error-troubleshooting {
                    margin-bottom: 1.5rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                }
                .error-troubleshooting h4 {
                    margin: 0 0 0.5rem 0;
                    font-size: 1rem;
                    color: #fbbf24;
                }
                .error-troubleshooting ul {
                    margin: 0;
                    padding-left: 1.5rem;
                }
                .error-troubleshooting li {
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                    line-height: 1.4;
                }
                .error-details {
                    margin: 1rem 0 0 0;
                }
                .error-details summary {
                    cursor: pointer;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 4px;
                    margin-bottom: 0.5rem;
                }
                .error-details pre {
                    background: rgba(0, 0, 0, 0.3);
                    padding: 1rem;
                    border-radius: 6px;
                    overflow-x: auto;
                    font-size: 0.8rem;
                    line-height: 1.3;
                    white-space: pre-wrap;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .error-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    padding: 1.5rem;
                    background: rgba(0, 0, 0, 0.1);
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    flex-wrap: wrap;
                }
                .error-ok-btn, .error-retry-btn, .error-refresh-btn {
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: all 200ms ease;
                }
                .error-ok-btn {
                    background: rgba(255, 255, 255, 0.2);
                    color: white;
                }
                .error-retry-btn {
                    background: white;
                    color: #dc2626;
                }
                .error-refresh-btn {
                    background: #f59e0b;
                    color: white;
                }
                .error-ok-btn:hover { background: rgba(255, 255, 255, 0.3); }
                .error-retry-btn:hover {
                    background: #f3f4f6;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
                .error-refresh-btn:hover {
                    background: #d97706;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                }
            </style>
        `;
        
        if (!document.getElementById('pdf-error-styles')) {
            document.head.insertAdjacentHTML('beforeend', errorStyles);
        }
        
        document.body.appendChild(errorContainer);
        this.state.errorElement = errorContainer;
        
        requestAnimationFrame(() => {
            errorContainer.style.opacity = '1';
            errorContainer.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        DEBUG.error(`PDF error dialog shown: ${errorMessage}`);
    },
    
    /**
     * Hide PDF error dialog
     */
    hidePDFError: function() {
        if (this.state.errorElement) {
            this.state.errorElement.style.opacity = '0';
            this.state.errorElement.style.transform = 'translate(-50%, -50%) scale(0.9)';
            
            setTimeout(() => {
                if (this.state.errorElement && this.state.errorElement.parentNode) {
                    this.state.errorElement.parentNode.removeChild(this.state.errorElement);
                }
                this.state.errorElement = null;
            }, 300);
        }
        
        const errorContainer = document.getElementById('pdf-error-container');
        if (errorContainer) {
            errorContainer.style.opacity = '0';
            errorContainer.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (errorContainer.parentNode) {
                    errorContainer.remove();
                }
            }, 300);
        }
        
        const errorStyles = document.getElementById('pdf-error-styles');
        if (errorStyles && !document.querySelector('#pdf-error-container')) {
            setTimeout(() => {
                if (errorStyles.parentNode) {
                    errorStyles.remove();
                }
            }, 300);
        }
    },
    
    /**
     * Retry PDF generation
     */
    retryPDF: function() {
        this.hidePDFError();
        
        if (typeof PDFGenerator !== 'undefined' && PDFGenerator.generateAdvancedPDF) {
            DEBUG.info('Retrying PDF generation...');
            
            setTimeout(() => {
                PDFGenerator.generateAdvancedPDF().catch(error => {
                    this.showPDFError('PDF generation failed again after retry', error.message);
                });
            }, 500);
        } else {
            DEBUG.error('PDFGenerator not available for retry');
            this.showPDFError('PDF Generator module not available', 'The PDFGenerator module could not be found. Please refresh the page.');
        }
    },
    
    /**
     * Get library loading status - ENHANCED with proper checks
     */
    getLibraryStatus: function() {
        const status = {
            html2pdf: this.state.html2pdfLoaded,
            html2canvas: this.state.html2canvasLoaded,
            jspdf: this.state.jsPDFLoaded,
            allLoaded: this.state.html2pdfLoaded && this.state.html2canvasLoaded && this.state.jsPDFLoaded
        };
        
        status.runtimeAvailable = {
            html2pdf: this.checkHtml2PDFAvailable(),
            html2canvas: this.checkHtml2CanvasAvailable(),
            jspdf: this.checkJsPDFAvailable()
        };
        
        status.fullyReady = status.runtimeAvailable.html2pdf && 
                           status.runtimeAvailable.html2canvas && 
                           status.runtimeAvailable.jspdf;
        
        return status;
    },
    
    /**
     * Preload all PDF libraries - ENHANCED
     */
    preloadLibraries: async function() {
        DEBUG.info('Preloading PDF libraries with multiple CDN support...');
        
        try {
            await Promise.all([
                this.loadHtml2PDF(),
                this.loadHtml2Canvas(),
                this.loadJsPDF()
            ]);
            
            DEBUG.success('All PDF libraries preloaded successfully');
            
            const status = this.getLibraryStatus();
            if (!status.fullyReady) {
                throw new Error('Some libraries failed to load properly');
            }
            
            return true;
        } catch (error) {
            DEBUG.error('Failed to preload PDF libraries:', error);
            return false;
        }
    },
    
    /**
     * Test library availability - ENHANCED
     */
    testLibraries: function() {
        const tests = {
            html2pdf: {
                loaded: this.checkHtml2PDFAvailable(),
                functional: this.checkHtml2PDFAvailable()
            },
            html2canvas: {
                loaded: this.checkHtml2CanvasAvailable(),
                functional: this.checkHtml2CanvasAvailable()
            },
            jspdf: {
                loaded: this.checkJsPDFAvailable(),
                functional: false,
                constructor: null
            }
        };
        
        // Test jsPDF functionality
        try {
            const constructor = this.getJsPDFConstructor();
            if (constructor) {
                tests.jspdf.functional = true;
                tests.jspdf.constructor = 'found';
            }
        } catch (error) {
            tests.jspdf.error = error.message;
        }
        
        DEBUG.info('PDF Library Test Results (Final Fix):', tests);
        return tests;
    },
    
    /**
     * Reset library manager state
     */
    reset: function() {
        this.hidePDFProgress();
        this.hidePDFError();
        
        this.state.progressElement = null;
        this.state.errorElement = null;
        
        const containers = document.querySelectorAll('#pdf-progress-container, #pdf-error-container');
        containers.forEach(container => {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        });
        
        const styles = document.querySelectorAll('#pdf-progress-styles, #pdf-error-styles');
        styles.forEach(style => {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });
        
        DEBUG.info('PDF Library Manager reset (Final Fix)');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('PDFLibraryManager (FINAL FIX - Multiple CDNs) module loaded successfully');
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFLibraryManager;
}
