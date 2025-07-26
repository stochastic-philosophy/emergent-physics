/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

// Ensure DEBUG is available (fallback if debug-logger.js fails)
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

window.Utils = {
    
    /**
     * Format timestamp for file naming
     */
    formatTimestamp: function(date = new Date()) {
        return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    },
    
    /**
     * Format date for display
     */
    formatDate: function(date = new Date(), locale = 'fi-FI') {
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    /**
     * Generate unique ID
     */
    generateId: function(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Debounce function calls
     */
    debounce: function(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    },
    
    /**
     * Throttle function calls
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Deep clone object (simple version)
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    },
    
    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHtml: function(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
    },
    
    /**
     * Escape HTML entities
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    },
    
    /**
     * Parse query string parameters
     */
    parseQueryString: function(queryString = window.location.search) {
        const params = {};
        const urlParams = new URLSearchParams(queryString);
        for (const [key, value] of urlParams) {
            params[key] = value;
        }
        return params;
    },
    
    /**
     * Build query string from object
     */
    buildQueryString: function(params) {
        const urlParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                urlParams.append(key, value);
            }
        });
        return urlParams.toString();
    },
    
    /**
     * Get file extension from filename
     */
    getFileExtension: function(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    },
    
    /**
     * Get filename without extension
     */
    getFilenameWithoutExtension: function(filename) {
        return filename.replace(/\.[^/.]+$/, '');
    },
    
    /**
     * Convert filename to display name (replace underscores with spaces, capitalize)
     */
    filenameToDisplayName: function(filename) {
        return this.getFilenameWithoutExtension(filename)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    /**
     * Check if object is empty
     */
    isEmpty: function(obj) {
        if (obj == null) return true;
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
        return Object.keys(obj).length === 0;
    },
    
    /**
     * Sleep for specified milliseconds
     */
    sleep: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Retry async function with exponential backoff
     */
    retry: async function(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                
                const backoffDelay = delay * Math.pow(2, attempt - 1);
                DEBUG.warn(`Attempt ${attempt} failed, retrying in ${backoffDelay}ms...`);
                await this.sleep(backoffDelay);
            }
        }
    },
    
    /**
     * Format file size in human readable format
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Check if current environment is mobile
     */
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    /**
     * Check if current environment is tablet
     */
    isTablet: function() {
        return /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(navigator.userAgent);
    },
    
    /**
     * Copy text to clipboard
     */
    copyToClipboard: async function(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful;
            }
        } catch (error) {
            DEBUG.error('Failed to copy to clipboard:', error);
            return false;
        }
    },
    
    /**
     * Validate JSON string
     */
    isValidJson: function(str) {
        try {
            JSON.parse(str);
            return true;
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Wait for element to exist in DOM
     */
    waitForElement: function(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver(mutations => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    },
    
    /**
     * Safe array access
     */
    safeArrayAccess: function(array, index, defaultValue = null) {
        return Array.isArray(array) && array[index] !== undefined ? array[index] : defaultValue;
    },
    
    /**
     * Safe object property access
     */
    safeObjectAccess: function(obj, path, defaultValue = null) {
        return path.split('.').reduce((current, key) => {
            return (current && current[key] !== undefined) ? current[key] : defaultValue;
        }, obj);
    }
};

// Initialize utility functions
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('Utils module loaded successfully');
});

/**
 * Export for Node.js compatibility (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
