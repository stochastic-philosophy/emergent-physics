/**
 * Main Application Logic (PDF modules removed only)
 * Coordinates between specialized modules and provides global state management
 * Only PDF functionality removed, all else unchanged
 */

// Ensure DEBUG is available (fallback)
if (typeof DEBUG === 'undefined') {
    window.DEBUG = {
        info: function(msg) { console.log('[INFO]', msg); },
        warn: function(msg) { console.warn('[WARN]', msg); },
        error: function(msg) { console.error('[ERROR]', msg); },
        success: function(msg) { console.log('[SUCCESS]', msg); },
        reportError: function(error, context) { 
            console.error('[ERROR]', context, error); 
        }
    };
}

window.App = {
    // Global application state
    state: {
        currentProject: null,
        currentFile: null,
        initialized: false,
        modules: {
            // Core modules
            projectManager: false,
            contentRenderer: false,
            navigationManager: false,
            markdownProcessor: false,
            fileManager: false,
            themeManager: false,
            ui: false,
            storage: false,
            utils: false
            // PDF modules removed: pdfGenerator, pdfLibraryManager
        }
    },
    
    // Application configuration
    config: {
        version: '2.1.0',
        phase: 'Phase 3 - PDF Generation (PDF removed)',
        debug: localStorage.getItem('debug_mode') === 'true',
        initTimeout: 10000, // 10 seconds
        retryAttempts: 3
    },
    
    /**
     * Initialize the application
     */
    init: async function() {
        DEBUG.info('=== INITIALIZING APP (PDF Modules Removed v2.1) ===');
        
        try {
            // Check for required dependencies
            if (!this.checkDependencies()) {
                DEBUG.warn('Dependencies not ready, retrying...');
                await this.retryInitialization();
                return;
            }
            
            DEBUG.success('All dependencies loaded, proceeding with initialization');
            
            // Initialize in order: libraries → modules → navigation
            await this.initializeLibraries();
            await this.initializeModules(); 
            await this.initializeNavigation();
            
            // PDF modules initialization removed
            
            // Mark as initialized
            this.state.initialized = true;
            DEBUG.success('=== APP INITIALIZED SUCCESSFULLY (PDF Removed v2.1) ===');
            
        } catch (error) {
            DEBUG.reportError(error, 'App initialization failed');
            this.handleInitializationError(error);
        }
    },
    
    /**
     * Check if all required dependencies are loaded
     */
    checkDependencies: function() {
        const requiredModules = [
            'ThemeManager', 'Utils', 'Storage', 'UI', 
            'FileManager', 'MarkdownProcessor',
            'ProjectManager', 'ContentRenderer', 'NavigationManager'
            // PDF modules removed: 'PDFGenerator', 'PDFLibraryManager'
        ];
        
        const missing = requiredModules.filter(dep => typeof window[dep] === 'undefined');
        
        if (missing.length > 0) {
            DEBUG.warn('Missing dependencies:', missing.join(', '));
            return false;
        }
        
        // Update module states
        this.updateModuleStates();
        return true;
    },
    
    /**
     * Update module availability states
     */
    updateModuleStates: function() {
        this.state.modules = {
            // Core modules
            projectManager: typeof ProjectManager !== 'undefined',
            contentRenderer: typeof ContentRenderer !== 'undefined', 
            navigationManager: typeof NavigationManager !== 'undefined',
            markdownProcessor: typeof MarkdownProcessor !== 'undefined',
            fileManager: typeof FileManager !== 'undefined',
            themeManager: typeof ThemeManager !== 'undefined',
            ui: typeof UI !== 'undefined',
            storage: typeof Storage !== 'undefined',
            utils: typeof Utils !== 'undefined'
            // PDF modules removed: pdfGenerator, pdfLibraryManager
        };
    },
    
    /**
     * Retry initialization with backoff
     */
    retryInitialization: async function() {
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            const delay = 100 * Math.pow(2, attempt - 1); // Exponential backoff
            DEBUG.info(`Initialization attempt ${attempt}/${this.config.retryAttempts} in ${delay}ms...`);
            
            await Utils.sleep(delay);
            
            if (this.checkDependencies()) {
                await this.init();
                return;
            }
        }
        
        throw new Error('Failed to initialize after retries - dependencies not available');
    },
    
    /**
     * Initialize external libraries
     */
    initializeLibraries: async function() {
        DEBUG.info('Initializing external libraries...');
        
        try {
            // Initialize MarkdownProcessor (loads CDN libraries)
            if (MarkdownProcessor && MarkdownProcessor.init) {
                await MarkdownProcessor.init();
                DEBUG.success('Markdown processor libraries loaded');
            }
        } catch (error) {
            DEBUG.warn('Some libraries failed to load:', error);
            // Continue anyway - libraries will load on demand
        }
    },
    
    /**
     * Initialize application modules
     */
    initializeModules: async function() {
        DEBUG.info('Initializing application modules...');
        
        try {
            // Initialize modules in dependency order
            if (ThemeManager && ThemeManager.init) {
                ThemeManager.init();
            }
            
            if (ProjectManager && ProjectManager.init) {
                ProjectManager.init();
            }
            
            if (ContentRenderer && ContentRenderer.init) {
                ContentRenderer.init();
            }
            
            DEBUG.success('Core application modules initialized');
        } catch (error) {
            DEBUG.reportError(error, 'Module initialization failed');
            throw error;
        }
    },
    
    /**
     * Initialize navigation
     */
    initializeNavigation: async function() {
        DEBUG.info('Initializing navigation...');
        
        try {
            if (NavigationManager && NavigationManager.init) {
                NavigationManager.init();
            }
            
            DEBUG.success('Navigation initialized');
        } catch (error) {
            DEBUG.reportError(error, 'Navigation initialization failed');
            throw error;
        }
    },
    
    /**
     * Handle initialization errors
     */
    handleInitializationError: function(error) {
        DEBUG.error('Critical initialization error:', error);
        
        if (UI && UI.showError) {
            UI.showError('Failed to initialize application. Please refresh the page.', false);
        } else {
            // Fallback error display
            document.body.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #dc2626;">
                    <h1>Application Error</h1>
                    <p>Failed to initialize. Please refresh the page.</p>
                    <pre style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
                        ${error.message}
                    </pre>
                </div>
            `;
        }
    },
    
    /**
     * Get current application state
     */
    getState: function() {
        return {
            ...this.state,
            currentProject: ProjectManager ? ProjectManager.getCurrentProject() : null,
            currentFile: ContentRenderer ? ContentRenderer.getCurrentFile() : null
        };
    },
    
    /**
     * Set application state
     */
    setState: function(newState) {
        Object.assign(this.state, newState);
        
        // Sync with individual modules
        if (newState.currentProject && ProjectManager) {
            ProjectManager.state.currentProject = newState.currentProject;
        }
        
        if (newState.currentFile && ContentRenderer) {
            ContentRenderer.state.currentFile = newState.currentFile;
        }
        
        DEBUG.info('App state updated:', newState);
    },
    
    /**
     * Get module status
     */
    getModuleStatus: function() {
        this.updateModuleStates();
        return { ...this.state.modules };
    },
    
    /**
     * Check if app is ready
     */
    isReady: function() {
        return this.state.initialized && this.checkDependencies();
    },
    
    /**
     * Get app information
     */
    getInfo: function() {
        const info = {
            version: this.config.version,
            phase: this.config.phase,
            initialized: this.state.initialized,
            modules: this.getModuleStatus(),
            state: this.getState()
        };
        
        return info;
    },
    
    /**
     * Restart application
     */
    restart: async function() {
        DEBUG.info('Restarting application...');
        
        try {
            // Reset state
            this.state.initialized = false;
            this.state.currentProject = null;
            this.state.currentFile = null;
            
            // Clear module states
            if (ProjectManager) {
                ProjectManager.state.currentProject = null;
            }
            if (ContentRenderer) {
                ContentRenderer.clearCurrentFile();
            }
            
            // Show loading
            if (UI) UI.showLoading('Restarting application...');
            
            // Re-initialize
            await this.init();
            
            // Hide loading
            if (UI) UI.hideLoading();
            
            DEBUG.success('Application restarted successfully');
            
        } catch (error) {
            DEBUG.reportError(error, 'Application restart failed');
            this.handleInitializationError(error);
        }
    },
    
    /**
     * Enable/disable debug mode
     */
    setDebugMode: function(enabled) {
        this.config.debug = enabled;
        localStorage.setItem('debug_mode', enabled.toString());
        
        if (DEBUG && DEBUG.setEnabled) {
            DEBUG.setEnabled(enabled);
        }
        
        DEBUG.info(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    /**
     * Get debug information
     */
    getDebugInfo: function() {
        const debugInfo = {
            config: this.config,
            state: this.getState(),
            modules: this.getModuleStatus(),
            performance: {
                loadTime: Date.now() - (window.performance.timing.navigationStart || 0),
                memory: window.performance.memory ? {
                    used: window.performance.memory.usedJSHeapSize,
                    total: window.performance.memory.totalJSHeapSize,
                    limit: window.performance.memory.jsHeapSizeLimit
                } : null
            },
            storage: Storage ? Storage.getUsageInfo() : null,
            cache: FileManager ? FileManager.getCacheStats() : null
        };
        
        return debugInfo;
    },
    
    /**
     * Export app state for debugging
     */
    exportState: function() {
        const state = {
            app: this.getDebugInfo(),
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        };
        
        return JSON.stringify(state, null, 2);
    },
    
    /**
     * Handle global errors
     */
    handleGlobalError: function(error, source = 'unknown') {
        DEBUG.reportError(error, `Global error from ${source}`);
        
        // Don't show error UI if we're not initialized yet
        if (!this.state.initialized) return;
        
        if (UI && UI.showNotification) {
            UI.showNotification('An error occurred. Check debug tools for details.', 'error');
        }
    }
};

// Global error handlers
window.addEventListener('error', function(e) {
    App.handleGlobalError(e.error || e, 'window.error');
});

window.addEventListener('unhandledrejection', function(e) {
    App.handleGlobalError(e.reason, 'unhandledrejection');
    e.preventDefault(); // Prevent console spam
});

/**
 * Initialize app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other modules are loaded
    setTimeout(() => {
        App.init().catch(error => {
            DEBUG.reportError(error, 'Failed to initialize app from DOMContentLoaded');
        });
    }, 200);
});

/**
 * Make App globally available
 */
window.App = App;

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
