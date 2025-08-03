/**
 * Content Renderer - Minimalistinen koordinaattori
 * Ottaa file extension → lataa {extension}_renderer.js → kutsuu render()
 * EI TIEDÄ SISÄLTÖTYYPEISTÄ MITÄÄN - vain koordinoi
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.ContentRenderer = {
    
    // Minimaalinen state
    state: {
        currentFile: null,
        viewHistory: [],
        loadedRenderers: new Set()
    },
    
    // Minimaalinen config
    config: {
        maxHistorySize: 20,
        renderersPath: 'assets/js/renderers/'
    },
    
    /**
     * Initialize ContentRenderer
     */
    init: function() {
        // Ei tarvita FileTypeDetector:ia - käytetään suoraan file extensionia
    },
    
    /**
     * Main entry point - View file content
     */
    viewFile: async function(filePath) {
        try {
            UI.showLoading('Loading file content...');
            
            // 1. Hae file extension suoraan
            const extension = this.getFileExtension(filePath);
            
            // 2. Tarkista onko viewable (yksinkertainen lista)
            if (!this.isViewableExtension(extension)) {
                UI.hideLoading();
                UI.showError(`File type not supported for viewing: .${extension}`, true);
                return;
            }
            
            // 3. Lataa tiedoston sisältö
            const content = await FileManager.loadFile(filePath);
            
            // 4. Lataa renderer suoraan extension perusteella
            const renderer = await this.getRenderer(extension);
            
            if (!renderer) {
                // Renderer puuttuu - näytä debug popup
                this.showRendererMissingPopup(extension);
                UI.hideLoading();
                return;
            }
            
            // 5. Renderöi sisältö
            await this.renderContent(content, filePath, renderer);
            
            // 6. Päivitä tilat
            this.updateStates(filePath);
            
            UI.hideLoading();
            
        } catch (error) {
            UI.hideLoading();
            UI.showError(`Failed to load file: ${error.message}`, true);
        }
    },
    
    /**
     * Hae file extension stringistä
     */
    getFileExtension: function(filePath) {
        const fileName = filePath.split('/').pop() || '';
        const lastDot = fileName.lastIndexOf('.');
        
        if (lastDot === -1 || lastDot === fileName.length - 1) {
            return 'txt'; // Fallback tuntemattomille
        }
        
        return fileName.slice(lastDot + 1).toLowerCase();
    },
    
    /**
     * Tarkista onko extension viewable (yksinkertainen lista)
     */
    isViewableExtension: function(extension) {
        const viewableExtensions = [
            'json', 'md', 'markdown', 'py', 'js', 'r', 'html', 'css', 'txt', 
            'csv', 'xml', 'yaml', 'yml', 'sh', 'bat', 'sql'
        ];
        return viewableExtensions.includes(extension);
    },
    
    /**
     * Hae renderer extension perusteella
     */
    getRenderer: async function(extension) {
        const rendererName = `${extension}_renderer`;
        
        // Tarkista onko renderer jo ladattu
        if (typeof window[rendererName] === 'undefined') {
            const success = await this.loadRenderer(extension);
            if (!success) return null;
        }
        
        return window[rendererName];
    },
    
    /**
     * Lataa renderer dynaamisesti
     */
    loadRenderer: async function(extension) {
        if (this.state.loadedRenderers.has(extension)) {
            return true; // Jo ladattu
        }
        
        const rendererFile = `${extension}_renderer.js`;
        const rendererPath = `${this.config.renderersPath}${rendererFile}`;
        
        try {
            await this.loadScript(rendererPath);
            this.state.loadedRenderers.add(extension);
            return true;
        } catch (error) {
            return false; // Lataus epäonnistui
        }
    },
    
    /**
     * Lataa script dynaamisesti
     */
    loadScript: function(src) {
        return new Promise((resolve, reject) => {
            // Tarkista onko script jo ladattu
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load: ${src}`));
            document.head.appendChild(script);
        });
    },
    
    /**
     * Näytä popup kun renderer puuttuu
     */
    showRendererMissingPopup: function(extension) {
        const debugInfo = {
            error: 'Renderer not found',
            extension: extension,
            expectedFile: `${extension}_renderer.js`,
            expectedPath: `${this.config.renderersPath}${extension}_renderer.js`,
            loadedRenderers: Array.from(this.state.loadedRenderers),
            solution: `Create ${extension}_renderer.js in renderers directory`
        };
        
        if (UI.showNotification) {
            UI.showNotification(
                `Renderer missing for .${extension} files. Check debug for details.`, 
                'warning', 
                10000
            );
        }
        
        // Debug mode popup
        if (window.DEBUG_MODE) {
            setTimeout(() => {
                if (UI.showNotification) {
                    UI.showNotification(
                        `DEBUG: ${JSON.stringify(debugInfo, null, 2)}`, 
                        'info', 
                        15000
                    );
                }
            }, 1000);
        }
    },
    
    /**
     * Renderöi sisältö käyttäen rendereriä
     */
    renderContent: async function(content, filePath, renderer) {
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
            throw new Error('Content area not found');
        }
        
        const fileName = filePath.split('/').pop();
        const displayName = Utils.filenameToDisplayName(fileName);
        
        // Luo perus layout
        let html = this.createBaseLayout(fileName, displayName, filePath);
        
        // Kutsu renderer
        if (renderer && renderer.render) {
            const renderedContent = await renderer.render(content, fileName, filePath);
            html += renderedContent;
        } else {
            html += `<div class="error-content">Renderer has no render() function</div>`;
        }
        
        html += `</div>`; // Sulje file-content div
        
        // Aseta HTML
        contentArea.innerHTML = html;
        
        // Post-processing (jos renderer sitä tukee)
        if (renderer && renderer.postProcess) {
            await renderer.postProcess(contentArea, content, fileName);
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    },
    
    /**
     * Luo perus layout
     */
    createBaseLayout: function(fileName, displayName, filePath) {
        const currentLang = UI.getCurrentLanguage();
        const backText = currentLang === 'fi' ? '← Takaisin projektiin' : '← Back to Project';
        
        return `<div class="file-content">
            <nav class="file-navigation">
                ${UI.createBackButton(backText)}
                <div class="file-info">
                    <h1>${Utils.escapeHtml(displayName)}</h1>
                </div>
                <div class="file-actions">
                    <button onclick="ContentRenderer.downloadFile('${filePath}')" class="download-file-btn">
                        ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                    </button>
                </div>
            </nav>
        `;
    },
    
    /**
     * Päivitä tilat renderöinnin jälkeen
     */
    updateStates: function(filePath) {
        // Update state
        this.state.currentFile = filePath;
        this.addToHistory(filePath);
        
        // Update App state if available
        if (typeof App !== 'undefined' && App.setState) {
            App.setState({ currentFile: filePath });
        }
        
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
    },
    
    /**
     * Download file
     */
    downloadFile: async function(filePath) {
        try {
            const fileName = filePath.split('/').pop();
            const extension = this.getFileExtension(fileName);
            
            // Yksinkertainen downloadable check
            const downloadableExtensions = [
                'json', 'csv', 'pdf', 'docx', 'doc', 'txt', 'py', 'js', 'r',
                'zip', 'tar', 'gz', 'xlsx', 'xls', 'pptx', 'ppt'
            ];
            
            if (!downloadableExtensions.includes(extension)) {
                UI.showNotification(`File type not supported for download: .${extension}`, 'warning');
                return;
            }
            
            const link = document.createElement('a');
            link.href = filePath;
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Lataus aloitettu' : 'Download started';
                UI.showNotification(message, 'success');
            }
            
        } catch (error) {
            if (UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Lataus epäonnistui' : 'Download failed';
                UI.showNotification(message, 'error');
            }
        }
    },
    
    // Utility methods
    getCurrentFile: function() {
        return this.state.currentFile;
    },
    
    addToHistory: function(filePath) {
        this.state.viewHistory = this.state.viewHistory.filter(path => path !== filePath);
        this.state.viewHistory.unshift(filePath);
        
        if (this.state.viewHistory.length > this.config.maxHistorySize) {
            this.state.viewHistory = this.state.viewHistory.slice(0, this.config.maxHistorySize);
        }
    },
    
    getHistory: function() {
        return this.state.viewHistory;
    },
    
    clearCurrentFile: function() {
        this.state.currentFile = null;
    },
    
    /**
     * Debug info (korvaa FileTypeDetector.getDebugInfo())
     */
    getDebugInfo: function() {
        return {
            loadedRenderers: Array.from(this.state.loadedRenderers),
            currentFile: this.state.currentFile,
            renderersPath: this.config.renderersPath,
            viewHistory: this.state.viewHistory.slice(0, 5) // Vain 5 viimeistä
        };
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua theme-debugin tapaan
    // console.log ei toimi tableteilla
    // ContentRenderer.getDebugInfo() sisältää kaikki debug-tiedot
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContentRenderer;
}
