/**
 * Storage Management
 * Handles localStorage operations, preferences, and data persistence
 */

window.Storage = {
    
    // Storage keys used throughout the app
    keys: {
        THEME: 'theme',
        LANGUAGE: 'language',
        DEBUG_MODE: 'debug_mode',
        USER_PREFERENCES: 'user_preferences',
        PROJECT_CACHE: 'project_cache',
        RECENT_PROJECTS: 'recent_projects',
        APP_VERSION: 'app_version'
    },
    
    // Default values
    defaults: {
        theme: 'light',
        language: 'fi',
        debug_mode: false,
        user_preferences: {},
        project_cache: {},
        recent_projects: [],
        app_version: '1.0.0'
    },
    
    /**
     * Check if localStorage is available
     */
    isAvailable: function() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            DEBUG.warn('localStorage not available:', error.message);
            return false;
        }
    },
    
    /**
     * Get item from localStorage with fallback
     */
    get: function(key, defaultValue = null) {
        if (!this.isAvailable()) {
            return defaultValue;
        }
        
        try {
            const value = localStorage.getItem(key);
            if (value === null) {
                return defaultValue;
            }
            
            // Try to parse as JSON, fallback to string
            try {
                return JSON.parse(value);
            } catch (parseError) {
                return value;
            }
        } catch (error) {
            DEBUG.error(`Failed to get ${key} from storage:`, error);
            return defaultValue;
        }
    },
    
    /**
     * Set item in localStorage
     */
    set: function(key, value) {
        if (!this.isAvailable()) {
            DEBUG.warn('Cannot save to localStorage - not available');
            return false;
        }
        
        try {
            const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
            DEBUG.info(`Saved ${key} to storage`);
            return true;
        } catch (error) {
            DEBUG.error(`Failed to save ${key} to storage:`, error);
            return false;
        }
    },
    
    /**
     * Remove item from localStorage
     */
    remove: function(key) {
        if (!this.isAvailable()) {
            return false;
        }
        
        try {
            localStorage.removeItem(key);
            DEBUG.info(`Removed ${key} from storage`);
            return true;
        } catch (error) {
            DEBUG.error(`Failed to remove ${key} from storage:`, error);
            return false;
        }
    },
    
    /**
     * Clear all localStorage
     */
    clear: function() {
        if (!this.isAvailable()) {
            return false;
        }
        
        try {
            localStorage.clear();
            DEBUG.warn('Cleared all localStorage');
            return true;
        } catch (error) {
            DEBUG.error('Failed to clear storage:', error);
            return false;
        }
    },
    
    /**
     * Get all storage keys and values
     */
    getAll: function() {
        if (!this.isAvailable()) {
            return {};
        }
        
        const result = {};
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                result[key] = this.get(key);
            }
        } catch (error) {
            DEBUG.error('Failed to get all storage items:', error);
        }
        
        return result;
    },
    
    /**
     * Get storage usage info
     */
    getUsageInfo: function() {
        if (!this.isAvailable()) {
            return { used: 0, total: 0, available: 0 };
        }
        
        try {
            const all = JSON.stringify(localStorage);
            const used = new Blob([all]).size;
            const total = 5 * 1024 * 1024; // 5MB typical limit
            
            return {
                used: used,
                total: total,
                available: total - used,
                percentage: (used / total) * 100
            };
        } catch (error) {
            DEBUG.error('Failed to calculate storage usage:', error);
            return { used: 0, total: 0, available: 0, percentage: 0 };
        }
    },
    
    /**
     * Theme management
     */
    getTheme: function() {
        return this.get(this.keys.THEME, this.defaults.theme);
    },
    
    setTheme: function(theme) {
        if (['light', 'dark'].includes(theme)) {
            return this.set(this.keys.THEME, theme);
        }
        DEBUG.error(`Invalid theme: ${theme}`);
        return false;
    },
    
    /**
     * Language management
     */
    getLanguage: function() {
        return this.get(this.keys.LANGUAGE, this.defaults.language);
    },
    
    setLanguage: function(language) {
        if (['fi', 'en'].includes(language)) {
            return this.set(this.keys.LANGUAGE, language);
        }
        DEBUG.error(`Invalid language: ${language}`);
        return false;
    },
    
    /**
     * Debug mode management
     */
    getDebugMode: function() {
        return this.get(this.keys.DEBUG_MODE, this.defaults.debug_mode);
    },
    
    setDebugMode: function(enabled) {
        return this.set(this.keys.DEBUG_MODE, Boolean(enabled));
    },
    
    /**
     * User preferences management
     */
    getPreferences: function() {
        return this.get(this.keys.USER_PREFERENCES, this.defaults.user_preferences);
    },
    
    setPreference: function(key, value) {
        const preferences = this.getPreferences();
        preferences[key] = value;
        return this.set(this.keys.USER_PREFERENCES, preferences);
    },
    
    getPreference: function(key, defaultValue = null) {
        const preferences = this.getPreferences();
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    },
    
    removePreference: function(key) {
        const preferences = this.getPreferences();
        delete preferences[key];
        return this.set(this.keys.USER_PREFERENCES, preferences);
    },
    
    /**
     * Project cache management
     */
    cacheProject: function(projectId, data, maxAge = 24 * 60 * 60 * 1000) { // 24 hours default
        const cache = this.get(this.keys.PROJECT_CACHE, {});
        cache[projectId] = {
            data: data,
            timestamp: Date.now(),
            maxAge: maxAge
        };
        return this.set(this.keys.PROJECT_CACHE, cache);
    },
    
    getCachedProject: function(projectId) {
        const cache = this.get(this.keys.PROJECT_CACHE, {});
        const cached = cache[projectId];
        
        if (!cached) {
            return null;
        }
        
        // Check if cache is expired
        if (Date.now() - cached.timestamp > cached.maxAge) {
            this.removeCachedProject(projectId);
            return null;
        }
        
        return cached.data;
    },
    
    removeCachedProject: function(projectId) {
        const cache = this.get(this.keys.PROJECT_CACHE, {});
        delete cache[projectId];
        return this.set(this.keys.PROJECT_CACHE, cache);
    },
    
    clearProjectCache: function() {
        return this.set(this.keys.PROJECT_CACHE, {});
    },
    
    /**
     * Recent projects management
     */
    addRecentProject: function(projectId, projectName = null, maxRecent = 5) {
        const recent = this.get(this.keys.RECENT_PROJECTS, []);
        
        // Remove existing entry if present
        const filtered = recent.filter(item => item.id !== projectId);
        
        // Add to beginning
        filtered.unshift({
            id: projectId,
            name: projectName || projectId,
            timestamp: Date.now()
        });
        
        // Keep only maxRecent items
        const trimmed = filtered.slice(0, maxRecent);
        
        return this.set(this.keys.RECENT_PROJECTS, trimmed);
    },
    
    getRecentProjects: function() {
        return this.get(this.keys.RECENT_PROJECTS, []);
    },
    
    clearRecentProjects: function() {
        return this.set(this.keys.RECENT_PROJECTS, []);
    },
    
    /**
     * App version management
     */
    getAppVersion: function() {
        return this.get(this.keys.APP_VERSION, this.defaults.app_version);
    },
    
    setAppVersion: function(version) {
        return this.set(this.keys.APP_VERSION, version);
    },
    
    /**
     * Migration and cleanup
     */
    migrate: function(fromVersion, toVersion) {
        DEBUG.info(`Migrating storage from ${fromVersion} to ${toVersion}`);
        
        // Add migration logic here when needed
        // For example:
        // if (fromVersion < '1.1.0') {
        //     // Migrate old data structure
        // }
        
        this.setAppVersion(toVersion);
    },
    
    /**
     * Cleanup old cache entries
     */
    cleanup: function() {
        try {
            // Clean expired project cache
            const cache = this.get(this.keys.PROJECT_CACHE, {});
            let cleaned = false;
            
            Object.keys(cache).forEach(projectId => {
                const cached = cache[projectId];
                if (Date.now() - cached.timestamp > cached.maxAge) {
                    delete cache[projectId];
                    cleaned = true;
                }
            });
            
            if (cleaned) {
                this.set(this.keys.PROJECT_CACHE, cache);
                DEBUG.info('Cleaned expired cache entries');
            }
            
            // Limit recent projects
            const recent = this.getRecentProjects();
            if (recent.length > 10) {
                const trimmed = recent.slice(0, 5);
                this.set(this.keys.RECENT_PROJECTS, trimmed);
                DEBUG.info('Trimmed recent projects list');
            }
            
        } catch (error) {
            DEBUG.error('Storage cleanup failed:', error);
        }
    },
    
    /**
     * Export all settings for backup
     */
    exportSettings: function() {
        const settings = {
            theme: this.getTheme(),
            language: this.getLanguage(),
            debug_mode: this.getDebugMode(),
            preferences: this.getPreferences(),
            recent_projects: this.getRecentProjects(),
            exported_at: new Date().toISOString(),
            app_version: this.getAppVersion()
        };
        
        return JSON.stringify(settings, null, 2);
    },
    
    /**
     * Import settings from backup
     */
    importSettings: function(settingsJson) {
        try {
            const settings = JSON.parse(settingsJson);
            
            if (settings.theme) this.setTheme(settings.theme);
            if (settings.language) this.setLanguage(settings.language);
            if (settings.debug_mode !== undefined) this.setDebugMode(settings.debug_mode);
            if (settings.preferences) this.set(this.keys.USER_PREFERENCES, settings.preferences);
            if (settings.recent_projects) this.set(this.keys.RECENT_PROJECTS, settings.recent_projects);
            
            DEBUG.success('Settings imported successfully');
            return true;
        } catch (error) {
            DEBUG.error('Failed to import settings:', error);
            return false;
        }
    }
};

// Initialize storage management
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('Storage module loaded successfully');
    
    // Perform cleanup on load
    Storage.cleanup();
    
    // Check storage usage
    const usage = Storage.getUsageInfo();
    if (usage.percentage > 80) {
        DEBUG.warn(`Storage usage high: ${usage.percentage.toFixed(1)}%`);
    }
});

/**
 * Export for Node.js compatibility (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
