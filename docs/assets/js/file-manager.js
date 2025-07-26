/**
 * File Manager - Tiedostojen lataus ja hallinta
 * Handles file loading, caching, and type detection for the research platform
 */

window.FileManager = {
    
    // Cache for loaded files
    cache: new Map(),
    
    // File type configurations
    fileTypes: {
        markdown: ['.md', '.markdown'],
        code: ['.py', '.js', '.r', '.html', '.css', '.json'],
        data: ['.json', '.csv', '.txt', '.pkl'],
        images: ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
        documents: ['.pdf', '.docx', '.doc'],
        downloadable: ['.zip', '.tar.gz', '.pdf', '.docx', '.pkl', '.json', '.csv']
    },
    
    // Configuration
    config: {
        maxCacheSize: 50, // Maximum number of files to cache
        defaultTimeout: 10000, // 10 seconds
        retryAttempts: 3,
        chunkSize: 1024 * 1024 // 1MB chunks for large files
    },
    
    /**
     * Load file from URL with caching and error handling
     */
    loadFile: async function(filePath, options = {}) {
        DEBUG.info(`Loading file: ${filePath}`);
        
        try {
            const cacheKey = this.generateCacheKey(filePath, options);
            
            // Check cache first
            if (this.cache.has(cacheKey) && !options.forceReload) {
                const cached = this.cache.get(cacheKey);
                if (this.isCacheValid(cached)) {
                    DEBUG.info(`File loaded from cache: ${filePath}`);
                    return cached.content;
                }
            }
            
            // Load file with retry logic
            const content = await Utils.retry(
                () => this.fetchFile(filePath, options),
                this.config.retryAttempts,
                1000
            );
            
            // Cache the result
            this.cacheFile(cacheKey, content, filePath);
            
            DEBUG.success(`File loaded successfully: ${filePath}`);
            return content;
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to load file: ${filePath}`);
            throw new Error(`Failed to load file: ${filePath} - ${error.message}`);
        }
    },
    
    /**
     * Fetch file from network
     */
    fetchFile: async function(filePath, options = {}) {
        const startTime = Date.now();
        
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'text/plain,application/json,*/*'
            },
            signal: this.createTimeoutSignal(options.timeout || this.config.defaultTimeout)
        };
        
        const response = await fetch(filePath, fetchOptions);
        const responseTime = Date.now() - startTime;
        
        // Log network request for debugging
        if (typeof DEBUG !== 'undefined' && DEBUG.logNetworkRequest) {
            DEBUG.logNetworkRequest('GET', filePath, response.status, responseTime);
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Handle different content types
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    },
    
    /**
     * Create timeout signal for fetch requests
     */
    createTimeoutSignal: function(timeout) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), timeout);
        return controller.signal;
    },
    
    /**
     * Parse markdown content and delegate to MarkdownProcessor
     */
    parseMarkdown: function(content, options = {}) {
        DEBUG.info('Parsing markdown content...');
        
        if (typeof MarkdownProcessor === 'undefined') {
            DEBUG.warn('MarkdownProcessor not available, returning plain text');
            return this.escapeHtml(content);
        }
        
        try {
            return MarkdownProcessor.processCombined(content, options);
        } catch (error) {
            DEBUG.reportError(error, 'Markdown parsing failed');
            return this.escapeHtml(content);
        }
    },
    
    /**
     * List files in a category directory (simulated from manifest)
     */
    listCategoryFiles: async function(basePath, category, manifest = null) {
        DEBUG.info(`Listing files for category: ${category} at ${basePath}`);
        
        try {
            // If manifest is provided, use it
            if (manifest && manifest.categories && manifest.categories[category]) {
                const categoryData = manifest.categories[category];
                return this.processManifestFiles(categoryData, basePath);
            }
            
            // Try to load category-specific manifest
            const categoryManifestUrl = `${basePath}${category}_manifest.json`;
            try {
                const categoryManifest = await this.loadFile(categoryManifestUrl);
                const parsedManifest = typeof categoryManifest === 'string' 
                    ? JSON.parse(categoryManifest) 
                    : categoryManifest;
                return this.processManifestFiles(parsedManifest, basePath);
            } catch (manifestError) {
                DEBUG.warn(`Category manifest not found: ${categoryManifestUrl}`);
            }
            
            // Fallback: return empty list with loading indicator
            return {
                files: [],
                total: 0,
                category: category,
                status: 'no_manifest'
            };
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to list files for category: ${category}`);
            return {
                files: [],
                total: 0,
                category: category,
                status: 'error',
                error: error.message
            };
        }
    },
    
    /**
     * Process files from manifest
     */
    processManifestFiles: function(categoryData, basePath) {
        const files = categoryData.files || [];
        
        const processedFiles = files.map(file => {
            // Handle different file formats in manifest
            if (typeof file === 'string') {
                return {
                    filename: file,
                    name: Utils.filenameToDisplayName(file),
                    path: `${basePath}${file}`,
                    type: this.detectFileType(file)
                };
            }
            
            return {
                filename: file.filename || file.name,
                name: file.name || Utils.filenameToDisplayName(file.filename),
                description: file.description || '',
                path: `${basePath}${file.filename}`,
                type: this.detectFileType(file.filename),
                tags: file.tags || [],
                created: file.created || null
            };
        });
        
        return {
            files: processedFiles,
            total: processedFiles.length,
            category: categoryData.name || 'Unknown Category',
            description: categoryData.description || ''
        };
    },
    
    /**
     * Detect file type from filename
     */
    detectFileType: function(filename) {
        if (!filename) return 'unknown';
        
        const extension = Utils.getFileExtension(filename).toLowerCase();
        
        for (const [type, extensions] of Object.entries(this.fileTypes)) {
            if (extensions.includes(`.${extension}`)) {
                return type;
            }
        }
        
        return 'unknown';
    },
    
    /**
     * Check if file is viewable in browser
     */
    isViewable: function(filename) {
        const type = this.detectFileType(filename);
        return ['markdown', 'code', 'data', 'images'].includes(type);
    },
    
    /**
     * Check if file is downloadable
     */
    isDownloadable: function(filename) {
        const type = this.detectFileType(filename);
        const extension = Utils.getFileExtension(filename);
        return this.fileTypes.downloadable.includes(`.${extension}`) || type === 'documents';
    },
    
    /**
     * Generate cache key for file
     */
    generateCacheKey: function(filePath, options = {}) {
        const optionsHash = JSON.stringify(options);
        return `${filePath}:${optionsHash}`;
    },
    
    /**
     * Check if cached content is still valid
     */
    isCacheValid: function(cached) {
        const maxAge = 60 * 60 * 1000; // 1 hour
        return Date.now() - cached.timestamp < maxAge;
    },
    
    /**
     * Cache file content
     */
    cacheFile: function(cacheKey, content, filePath) {
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.config.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        
        this.cache.set(cacheKey, {
            content: content,
            timestamp: Date.now(),
            filePath: filePath,
            size: typeof content === 'string' ? content.length : JSON.stringify(content).length
        });
        
        DEBUG.info(`File cached: ${filePath} (cache size: ${this.cache.size})`);
    },
    
    /**
     * Clear file cache
     */
    clearCache: function() {
        this.cache.clear();
        DEBUG.info('File cache cleared');
    },
    
    /**
     * Get cache statistics
     */
    getCacheStats: function() {
        let totalSize = 0;
        let oldestTimestamp = Date.now();
        let newestTimestamp = 0;
        
        for (const cached of this.cache.values()) {
            totalSize += cached.size || 0;
            oldestTimestamp = Math.min(oldestTimestamp, cached.timestamp);
            newestTimestamp = Math.max(newestTimestamp, cached.timestamp);
        }
        
        return {
            entries: this.cache.size,
            totalSize: totalSize,
            formattedSize: Utils.formatFileSize(totalSize),
            oldestEntry: oldestTimestamp,
            newestEntry: newestTimestamp,
            maxEntries: this.config.maxCacheSize
        };
    },
    
    /**
     * Preload files for better performance
     */
    preloadFiles: async function(filePaths) {
        DEBUG.info(`Preloading ${filePaths.length} files...`);
        
        const promises = filePaths.map(filePath => 
            this.loadFile(filePath).catch(error => {
                DEBUG.warn(`Failed to preload: ${filePath} - ${error.message}`);
                return null;
            })
        );
        
        const results = await Promise.allSettled(promises);
        const successful = results.filter(result => result.status === 'fulfilled').length;
        
        DEBUG.info(`Preloaded ${successful}/${filePaths.length} files successfully`);
        return successful;
    },
    
    /**
     * Escape HTML for safe display
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Format file size for display
     */
    formatFileSize: function(bytes) {
        return Utils.formatFileSize(bytes);
    },
    
    /**
     * Download file (trigger browser download)
     */
    downloadFile: async function(filePath, filename = null) {
        DEBUG.info(`Downloading file: ${filePath}`);
        
        try {
            const content = await this.loadFile(filePath);
            const blob = new Blob([content], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || filePath.split('/').pop();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            DEBUG.success(`File downloaded: ${filePath}`);
            
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('File downloaded successfully', 'success');
            }
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to download file: ${filePath}`);
            
            if (typeof UI !== 'undefined' && UI.showNotification) {
                UI.showNotification('Failed to download file', 'error');
            }
            
            throw error;
        }
    }
};

// Initialize FileManager
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('FileManager module loaded successfully');
    
    // Clean up cache periodically
    setInterval(() => {
        const stats = FileManager.getCacheStats();
        if (stats.entries > FileManager.config.maxCacheSize * 0.8) {
            DEBUG.info('Cleaning up file cache...');
            // Remove entries older than 30 minutes
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
            for (const [key, cached] of FileManager.cache.entries()) {
                if (cached.timestamp < thirtyMinutesAgo) {
                    FileManager.cache.delete(key);
                }
            }
        }
    }, 5 * 60 * 1000); // Check every 5 minutes
});

/**
 * Export for Node.js compatibility (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FileManager;
}
