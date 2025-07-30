/**
 * PDF Generator - KORJATTU versio
 * Korjaa LaTeX-kolminkertaisuuden ja sisällön puuttumisen
 */

window.PDFGenerator = {
    
    // Configuration
    config: {
        debug: true, // Visuaalinen debug tableteille
        html2pdfOptions: {
            margin: 15,
            filename: 'document.pdf',
            image: { type: 'jpeg', quality: 0.85 },
            html2canvas: { 
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                letterRendering: true,
                logging: false,
                width: 800,
                height: 1200,
                scrollX: 0,
                scrollY: 0
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
                avoid: 'img'
            }
        }
    },
    
    // State
    state: {
        isGenerating: false,
        debugPanel: null,
        originalContent: null,
        processedContent: null
    },
    
    /**
     * Pääfunktio PDF-generointiin (korjattu versio)
     */
    generateAdvancedPDF: async function() {
        if (this.state.isGenerating) {
            this.debugLog('⚠️ PDF-generointi jo käynnissä');
            return;
        }
        
        this.state.isGenerating = true;
        this.debugLog('🚀 Aloitetaan PDF-generointi (KORJATTU)');
        
        try {
            // Näytä progress ja debug-paneeli
            this.showDebugPanel();
            this.updateProgress(5, 'Alustetaan PDF-generointi...');
            
            // Lataa kirjastot
            await this.ensureLibrariesLoaded();
            this.updateProgress(15, 'Kirjastot ladattu');
            
            // Hae ja käsittele sisältö
            const contentElement = await this.prepareContent();
            this.updateProgress(30, 'Sisältö valmisteltu');
            
            // Korjaa LaTeX-renderöinti
            await this.fixLatexRendering(contentElement);
            this.updateProgress(50, 'LaTeX-matematiikka korjattu');
            
            // Paranna sisällön näkyvyyttä
            this.enhanceContentVisibility(contentElement);
            this.updateProgress(65, 'Sisältö optimoitu');
            
            // Generoi PDF
            await this.performPDFGeneration(contentElement);
            this.updateProgress(90, 'PDF generoitu');
            
            // Siivoa
            this.cleanup(contentElement);
            this.updateProgress(100, 'PDF valmis!');
            
            this.debugLog('✅ PDF-generointi onnistui');
            
        } catch (error) {
            this.debugLog(`❌ PDF-generointi epäonnistui: ${error.message}`);
            this.showError(`PDF-generointi epäonnistui: ${error.message}`);
        } finally {
            this.state.isGenerating = false;
            setTimeout(() => this.hideDebugPanel(), 3000);
        }
    },
    
    /**
     * Valmistele sisältö PDF-generointiin
     */
    prepareContent: async function() {
        this.debugLog('📄 Valmistellaan sisältöä...');
        
        // Hae pääsisältö
        const mainContent = document.querySelector('#main-content');
        if (!mainContent) {
            throw new Error('Pääsisältöä ei löytynyt');
        }
        
        // Kopioi sisältö prosessointia varten
        const clonedContent = mainContent.cloneNode(true);
        this.state.originalContent = clonedContent;
        
        this.debugLog(`📏 Sisällön koko: ${clonedContent.innerHTML.length} merkkiä`);
        
        // Varmista että kaikki sisältö on näkyvissä
        clonedContent.style.cssText = `
            position: static !important;
            visibility: visible !important;
            opacity: 1 !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            width: 100% !important;
            max-width: 800px !important;
            margin: 0 auto !important;
            padding: 20px !important;
            background: white !important;
            color: black !important;
            font-family: "Times New Roman", serif !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
        `;
        
        return clonedContent;
    },
    
    /**
     * Korjaa LaTeX-renderöinnin kolminkertaisuusongelma
     */
    fixLatexRendering: async function(contentElement) {
        this.debugLog('🔧 Korjataan LaTeX-renderöinti...');
        
        try {
            // Etsi kaikki MathJax-renderöidyt elementit
            const mathElements = contentElement.querySelectorAll(
                '.MathJax, .MathJax_Display, .MathJax_Preview, mjx-container, mjx-math'
            );
            
            this.debugLog(`🧮 Löytyi ${mathElements.length} matematiikkaelementtiä`);
            
            // Poista duplikaatit ja vanha renderöinti
            mathElements.forEach((element, index) => {
                this.debugLog(`🔍 Käsitellään math-elementti ${index + 1}`);
                
                // Jos on MathJax-kontti, säilytä vain yksi versio
                if (element.classList.contains('MathJax') || element.tagName === 'MJX-CONTAINER') {
                    // Poista sisarukset joilla sama sisältö
                    let sibling = element.nextElementSibling;
                    while (sibling) {
                        const nextSibling = sibling.nextElementSibling;
                        if (this.isSimilarMathElement(element, sibling)) {
                            this.debugLog(`🗑️ Poistetaan duplikaatti math-elementti`);
                            sibling.remove();
                        }
                        sibling = nextSibling;
                    }
                    
                    // Varmista että elementti on näkyvä
                    element.style.cssText = `
                        display: inline-block !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        position: static !important;
                        margin: 5px !important;
                    `;
                }
            });
            
            // Varmista että MathJax ei renderöi uudelleen
            if (window.MathJax && window.MathJax.Hub) {
                window.MathJax.Hub.Config({
                    skipStartupTypeset: true,
                    showProcessingMessages: false
                });
            }
            
            this.debugLog('✅ LaTeX-renderöinti korjattu');
            
        } catch (error) {
            this.debugLog(`❌ LaTeX-korjaus epäonnistui: ${error.message}`);
        }
    },
    
    /**
     * Tarkista ovatko kaksi math-elementtiä samankaltaisia
     */
    isSimilarMathElement: function(element1, element2) {
        // Tarkista tagit
        if (element1.tagName !== element2.tagName) return false;
        
        // Tarkista sisältö (lyhyesti)
        const text1 = element1.textContent?.trim() || '';
        const text2 = element2.textContent?.trim() || '';
        
        return text1 === text2 && text1.length > 0;
    },
    
    /**
     * Paranna sisällön näkyvyyttä PDF:ssä
     */
    enhanceContentVisibility: function(contentElement) {
        this.debugLog('👁️ Parannetaan sisällön näkyvyyttä...');
        
        // Varmista että kaikki tekstielementit ovat näkyvissä
        const allElements = contentElement.querySelectorAll('*');
        let hiddenCount = 0;
        
        allElements.forEach((element, index) => {
            const computedStyle = window.getComputedStyle(element);
            
            // Korjaa piilotetut elementit
            if (computedStyle.display === 'none' || 
                computedStyle.visibility === 'hidden' || 
                computedStyle.opacity === '0') {
                
                element.style.display = 'block';
                element.style.visibility = 'visible';
                element.style.opacity = '1';
                hiddenCount++;
            }
            
            // Korjaa absolute/fixed positioning
            if (computedStyle.position === 'absolute' || computedStyle.position === 'fixed') {
                element.style.position = 'static';
            }
            
            // Varmista tekstin kontrasti
            if (element.tagName === 'P' || element.tagName === 'H1' || 
                element.tagName === 'H2' || element.tagName === 'H3' ||
                element.tagName === 'LI' || element.tagName === 'SPAN') {
                element.style.color = 'black';
                element.style.backgroundColor = 'transparent';
            }
        });
        
        this.debugLog(`🔍 Korjattiin ${hiddenCount} piilotettu elementti`);
        
        // Varmista että koko sisältö mahtuu
        const contentHeight = contentElement.scrollHeight;
        this.debugLog(`📏 Sisällön korkeus: ${contentHeight}px`);
        
        // Korjaa overflow-ongelmat
        contentElement.style.overflow = 'visible';
        contentElement.style.height = 'auto';
        contentElement.style.maxHeight = 'none';
    },
    
    /**
     * Suorita PDF-generointi korjatuilla asetuksilla
     */
    performPDFGeneration: async function(contentElement) {
        this.debugLog('📄 Generoidaan PDF...');
        
        // Tarkistetaan html2pdf
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf-kirjasto ei ole ladattu');
        }
        
        // Varmista että sisältö on liitetty DOM:iin renderöintiä varten
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: 800px;
            background: white;
            padding: 20px;
            visibility: hidden;
        `;
        
        tempContainer.appendChild(contentElement);
        document.body.appendChild(tempContainer);
        
        try {
            // Odota että sisältö renderöityy
            await this.waitForContentRender(contentElement);
            
            // Parannettuja html2pdf asetuksia
            const options = {
                ...this.config.html2pdfOptions,
                html2canvas: {
                    ...this.config.html2pdfOptions.html2canvas,
                    height: Math.min(contentElement.scrollHeight + 100, 5000),
                    width: 800,
                    y: 0,
                    scrollX: 0,
                    scrollY: 0,
                    windowWidth: 800,
                    windowHeight: contentElement.scrollHeight + 100
                },
                filename: this.generateFilename()
            };
            
            this.debugLog(`⚙️ PDF-asetukset: ${JSON.stringify(options, null, 2)}`);
            
            // Generoi PDF
            await html2pdf()
                .set(options)
                .from(contentElement)
                .save();
                
            this.debugLog('✅ PDF tallennettu onnistuneesti');
            
        } finally {
            // Siivoa temp-elementti
            if (tempContainer.parentNode) {
                tempContainer.parentNode.removeChild(tempContainer);
            }
        }
    },
    
    /**
     * Odota että sisältö renderöityy täysin
     */
    waitForContentRender: function(element) {
        return new Promise((resolve) => {
            // Odota että kuvat latautuvat
            const images = element.querySelectorAll('img');
            let loadedImages = 0;
            
            if (images.length === 0) {
                setTimeout(resolve, 500); // Minimaalinen odotus
                return;
            }
            
            images.forEach(img => {
                if (img.complete) {
                    loadedImages++;
                } else {
                    img.onload = img.onerror = () => {
                        loadedImages++;
                        if (loadedImages === images.length) {
                            setTimeout(resolve, 300);
                        }
                    };
                }
            });
            
            if (loadedImages === images.length) {
                setTimeout(resolve, 300);
            }
            
            // Maksimi odotusaika
            setTimeout(resolve, 3000);
        });
    },
    
    /**
     * Varmista että kirjastot ovat ladattu
     */
    ensureLibrariesLoaded: async function() {
        this.debugLog('📚 Tarkistetaan kirjastot...');
        
        if (typeof PDFLibraryManager !== 'undefined') {
            await PDFLibraryManager.loadHtml2PDF();
            this.debugLog('✅ html2pdf ladattu PDFLibraryManagerin kautta');
        } else {
            throw new Error('PDFLibraryManager ei ole käytettävissä');
        }
    },
    
    /**
     * Generoi tiedostonimi
     */
    generateFilename: function() {
        const currentFile = ContentRenderer?.getCurrentFile();
        if (currentFile) {
            const filename = currentFile.split('/').pop();
            return filename.replace(/\.[^/.]+$/, '') + '_document.pdf';
        }
        
        const timestamp = new Date().toISOString().slice(0, 10);
        return `research_document_${timestamp}.pdf`;
    },
    
    /**
     * Visuaalinen debug-paneeli tabletille
     */
    showDebugPanel: function() {
        if (!this.config.debug) return;
        
        this.hideDebugPanel(); // Poista vanha
        
        const panel = document.createElement('div');
        panel.id = 'pdf-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 12px;
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 15px;
            z-index: 20000;
            max-height: 300px;
            overflow-y: auto;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong style="color: #ffff00;">📄 PDF Debug (Tabletti)</strong>
                <button onclick="PDFGenerator.hideDebugPanel()" style="background: #ff0000; color: white; border: none; padding: 5px 10px; border-radius: 5px;">Sulje</button>
            </div>
            <div id="debug-progress" style="margin-bottom: 10px;">
                <div style="background: #333; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div id="debug-progress-bar" style="background: #00ff00; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
                <div id="debug-progress-text" style="margin-top: 5px;">Aloitetaan...</div>
            </div>
            <div id="debug-log" style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 5px; max-height: 150px; overflow-y: auto;">
                Debug-lokia...
            </div>
        `;
        
        document.body.appendChild(panel);
        this.state.debugPanel = panel;
    },
    
    /**
     * Päivitä progress-palkki
     */
    updateProgress: function(percent, message) {
        if (!this.state.debugPanel) return;
        
        const progressBar = this.state.debugPanel.querySelector('#debug-progress-bar');
        const progressText = this.state.debugPanel.querySelector('#debug-progress-text');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressText) progressText.textContent = `${percent}% - ${message}`;
        
        this.debugLog(`📊 ${percent}% - ${message}`);
    },
    
    /**
     * Debug-lokitus
     */
    debugLog: function(message) {
        console.log('[PDF Debug]', message);
        
        if (!this.state.debugPanel) return;
        
        const logContainer = this.state.debugPanel.querySelector('#debug-log');
        if (logContainer) {
            const timestamp = new Date().toLocaleTimeString();
            logContainer.innerHTML += `<div style="margin: 2px 0; color: #00ff88;">[${timestamp}] ${message}</div>`;
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    },
    
    /**
     * Piilota debug-paneeli
     */
    hideDebugPanel: function() {
        if (this.state.debugPanel) {
            this.state.debugPanel.remove();
            this.state.debugPanel = null;
        }
    },
    
    /**
     * Näytä virhe
     */
    showError: function(message) {
        if (typeof UI !== 'undefined' && UI.showNotification) {
            UI.showNotification(message, 'error', 8000);
        }
        
        // Näytä myös debug-paneelissa
        this.debugLog(`❌ VIRHE: ${message}`);
    },
    
    /**
     * Siivous
     */
    cleanup: function(contentElement) {
        this.debugLog('🧹 Siivotaan...');
        
        // Palauta alkuperäinen sisältö jos tarpeen
        this.state.originalContent = null;
        this.state.processedContent = null;
    },
    
    /**
     * PDF valinnoilla (yksinkertaistettu)
     */
    generatePDFWithOptions: async function() {
        // Yksinkertainen versio - käytä pääfunktiota
        this.debugLog('⚙️ PDF valinnoilla - käytetään korjattua generointia');
        return this.generateAdvancedPDF();
    },
    
    /**
     * Tila-info
     */
    getStatus: function() {
        return {
            isGenerating: this.state.isGenerating,
            debugMode: this.config.debug,
            debugPanelVisible: !!this.state.debugPanel
        };
    }
};

// Vienti
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFGenerator;
}

// Globaali funktio debug-paneelin sulkemiseen
window.PDFGenerator = PDFGenerator;
