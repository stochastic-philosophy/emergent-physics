/**
 * Debug Logger - Tablet-friendly error handling and logging
 * Provides comprehensive debugging tools for development
 */

window.DEBUG = window.DEBUG || {
    enabled: localStorage.getItem('debug_mode') === 'true',
    
    /**
     * Main logging function
     */
    log: function(message, type = 'info') {
        // Always log to browser console
        if (console[type]) {
            console[type](message);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
        
        // If debug mode is enabled, also show in UI
        if (this.enabled) {
            this._logToUI(message, type);
        }
    },
    
    /**
     * Log to UI elements (for debug.html)
     */
    _logToUI: function(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        
        // Try to find debug console in current page
        const debugConsole = document.getElementById('debug-console');
        if (debugConsole) {
            const logElement = document.createElement('div');
            logElement.className = `debug-log debug-${type}`;
            logElement.textContent = logMessage;
            debugConsole.appendChild(logElement);
            debugConsole.scrollTop = debugConsole.scrollHeight;
        }
        
        // Try to add to debug overlay if it exists
        const debugOverlay = document.getElementById('debug-overlay');
        if (debugOverlay) {
            this._addToDebugOverlay(logMessage, type);
        }
    },
    
    /**
     * Add debug overlay to main site
     */
    _addToDebugOverlay: function(message, type) {
        let overlay = document.getElementById('debug-overlay');
        if (!overlay) {
            overlay = this._createDebugOverlay();
        }
        
        const logsList = overlay.querySelector('.debug-logs');
        const logElement = document.createElement('div');
        logElement.className = `debug-log debug-${type}`;
        logElement.textContent = message;
        logsList.appendChild(logElement);
        
        // Keep only last 50 messages
        const logs = logsList.children;
        if (logs.length > 50) {
            logsList.removeChild(logs[0]);
        }
        
        logsList.scrollTop = logsList.scrollHeight;
    },
    
    /**
     * Create floating debug overlay for main site
     */
    _createDebugOverlay: function() {
        const overlay = document.createElement('div');
        overlay.id = 'debug-overlay';
        overlay.innerHTML = `
            <div class="debug-overlay-header">
                <span>🐛 Debug Log</span>
                <button onclick="DEBUG.toggleOverlay()" class="debug-close">×</button>
            </div>
            <div class="debug-logs"></div>
        `;
        
        // Add styles
        const styles = `
            #debug-overlay {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 300px;
                max-height: 400px;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #333;
                border-radius: 8px;
                z-index: 10000;
                font-family: monospace;
                font-size: 12px;
                color: #fff;
                display: none;
            }
            .debug-overlay-header {
                background: #333;
                padding: 10px;
                border-radius: 8px 8px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .debug-close {
                background: none;
                border: none;
                color: #fff;
                font-size: 16px;
                cursor: pointer;
                padding: 0;
                margin: 0;
            }
            .debug-logs {
                padding: 10px;
                max-height: 300px;
                overflow-y: auto;
            }
            .debug-logs .debug-log {
                margin-bottom: 5px;
                padding: 2px 5px;
                border-radius: 3px;
                word-break: break-word;
            }
            .debug-logs .debug-info { color: #2196F3; }
            .debug-logs .debug-warn { color: #FF9800; }
            .debug-logs .debug-error { color: #f44336; font-weight: bold; }
            .debug-logs .debug-success { color: #4CAF50; }
        `;
        
        // Add styles to head if not already added
        if (!document.getElementById('debug-overlay-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'debug-overlay-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
        
        document.body.appendChild(overlay);
        return overlay;
    },
    
    /**
     * Toggle debug overlay visibility
     */
    toggleOverlay: function() {
        const overlay = document.getElementById('debug-overlay');
        if (overlay) {
            overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
        }
    },
    
    /**
     * Enable/disable debug mode
     */
    setEnabled: function(enabled) {
        this.enabled = enabled;
        localStorage.setItem('debug_mode', enabled.toString());
        
        if (enabled) {
            document.documentElement.classList.add('debug-mode');
            this.info('Debug mode enabled');
        } else {
            document.documentElement.classList.remove('debug-mode');
            const overlay = document.getElementById('debug-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
        
        // Update debug toggle button if it exists
        const debugToggle = document.getElementById('debug-toggle');
        if (debugToggle) {
            debugToggle.classList.toggle('active', enabled);
        }
        
        // Show/hide debug toggle button
        const debugToggleContainer = document.querySelector('.debug-toggle');
        if (debugToggleContainer) {
            debugToggleContainer.style.display = enabled ? 'block' : 'none';
        }
    },
    
    /**
     * Convenience methods
     */
    info: function(message) { this.log(message, 'info'); },
    warn: function(message) { this.log(message, 'warn'); },
    error: function(message) { this.log(message, 'error'); },
    success: function(message) { this.log(message, 'success'); },
    
    /**
     * Error reporting with stack trace
     */
    reportError: function(error, context = '') {
        const errorMessage = `${context ? context + ': ' : ''}${error.message}`;
        this.error(errorMessage);
        
        if (error.stack) {
            this.error(`Stack trace: ${error.stack}`);
        }
    },
    
    /**
     * Performance monitoring
     */
    time: function(label) {
        if (this.enabled) {
            console.time(label);
        }
    },
    
    timeEnd: function(label) {
        if (this.enabled) {
            console.timeEnd(label);
        }
    },
    
    /**
     * Network request monitoring
     */
    logNetworkRequest: function(method, url, status, responseTime) {
        const message = `${method} ${url} - ${status} (${responseTime}ms)`;
        if (status >= 200 && status < 300) {
            this.success(`Network: ${message}`);
        } else if (status >= 400) {
            this.error(`Network: ${message}`);
        } else {
            this.info(`Network: ${message}`);
        }
    }
};

/**
 * Global error handlers
 */
window.addEventListener('error', function(e) {
    DEBUG.error(`Global Error: ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`);
});

window.addEventListener('unhandledrejection', function(e) {
    DEBUG.error(`Unhandled Promise Rejection: ${e.reason}`);
    e.preventDefault(); // Prevent console spam
});

/**
 * Initialize debug mode based on localStorage or URL parameter
 */
document.addEventListener('DOMContentLoaded', function() {
    // Check for debug parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true') {
        DEBUG.setEnabled(true);
    } else {
        // Use stored preference
        DEBUG.setEnabled(localStorage.getItem('debug_mode') === 'true');
    }
    
    // Set up debug toggle if it exists
    const debugToggle = document.getElementById('debug-toggle');
    if (debugToggle) {
        debugToggle.addEventListener('click', function() {
            DEBUG.setEnabled(!DEBUG.enabled);
        });
    }
    
    DEBUG.success('Debug logger initialized');
});

/**
 * Export for use in other modules
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEBUG;
}
