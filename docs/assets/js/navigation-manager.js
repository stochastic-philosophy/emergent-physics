/**
 * Navigation Manager - URL-navigaatio ja historia
 * Handles URL routing, browser history, and navigation events
 */

window.NavigationManager = {
    
    // State specific to navigation
    state: {
        currentRoute: {},
        navigationHistory: [],
        isNavigating: false
    },
    
    // Configuration
    config: {
        maxHistorySize: 50,
        pushStateEnabled: true
    },
    
    /**
     * Initialize NavigationManager
     */
    init: function() {
        DEBUG.info('Initializing NavigationManager...');
        this.setupEventListeners();
        this.handleInitialRoute();
    },
    
    /**
     * Setup event listeners for navigation
     */
    setupEventListeners: function() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (this.state.isNavigating) return; // Prevent loops
            
            DEBUG.info('Handling popstate event');
            if (e.state && e.state.project) {
                this.navigateToProject(e.state.project, e.state.file, false);
            } else {
                this.goBackToHome(false);
            }
        });
        
        // Handle clicks on internal links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href]');
            if (link && this.isInternalLink(link.href)) {
                e.preventDefault();
                this.handleInternalLink(link.href);
            }
        });
        
        DEBUG.info('Navigation event listeners set up');
    },
    
    /**
     * Handle initial route on page load
     */
    handleInitialRoute: function() {
        const params = Utils.parseQueryString();
        const project = params.project;
        const file = params.file;
        
        DEBUG.info(`Handling initial route. Project: ${project}, File: ${file}`);
        
        if (project) {
            // Small delay to ensure other modules are ready
            setTimeout(() => {
                this.navigateToProject(project, file, false);
            }, 300);
        } else {
            this.showWelcome();
        }
    },
    
    /**
     * Navigate to project with optional file
     */
    navigateToProject: async function(projectId, fileId = null, updateHistory = true) {
        DEBUG.info(`Navigating to project: ${projectId}, file: ${fileId}`);
        
        try {
            this.state.isNavigating = true;
            
            // Load project first
            if (typeof ProjectManager !== 'undefined') {
                await ProjectManager.selectProject(projectId);
            }
            
            // Then load file if specified
            if (fileId && typeof ContentRenderer !== 'undefined') {
                const filePath = ProjectManager.findFileInProject(fileId);
                if (filePath) {
                    await ContentRenderer.viewFile(filePath);
                }
            }
            
            // Update URL and history
            if (updateHistory) {
                this.updateUrl(projectId, fileId);
            }
            
            // Update navigation state
            this.state.currentRoute = { project: projectId, file: fileId };
            this.addToNavigationHistory({ project: projectId, file: fileId });
            
        } catch (error) {
            DEBUG.reportError(error, 'Navigation failed');
        } finally {
            this.state.isNavigating = false;
        }
    },
    
    /**
     * Navigate to file within current project
     */
    navigateToFile: async function(filePath, updateHistory = true) {
        DEBUG.info(`Navigating to file: ${filePath}`);
        
        try {
            this.state.isNavigating = true;
            
            if (typeof ContentRenderer !== 'undefined') {
                await ContentRenderer.viewFile(filePath);
            }
            
            // Update URL with file parameter
            const projectId = ProjectManager.getCurrentProject();
            const fileName = filePath.split('/').pop();
            
            if (updateHistory) {
                this.updateUrl(projectId, fileName);
            }
            
            // Update navigation state
            this.state.currentRoute = { project: projectId, file: fileName };
            this.addToNavigationHistory({ project: projectId, file: fileName });
            
        } catch (error) {
            DEBUG.reportError(error, 'File navigation failed');
        } finally {
            this.state.isNavigating = false;
        }
    },
    
    /**
     * Update URL without page reload
     */
    updateUrl: function(projectId, fileId = null) {
        if (!this.config.pushStateEnabled) return;
        
        const params = { project: projectId };
        if (fileId) params.file = fileId;
        
        const queryString = Utils.buildQueryString(params);
        const url = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
        
        const state = { project: projectId, file: fileId };
        
        try {
            window.history.pushState(state, '', url);
            DEBUG.info(`URL updated: ${url}`);
        } catch (error) {
            DEBUG.warn('Failed to update URL:', error);
        }
    },
    
    /**
     * Replace current URL state
     */
    replaceUrl: function(projectId, fileId = null) {
        if (!this.config.pushStateEnabled) return;
        
        const params = { project: projectId };
        if (fileId) params.file = fileId;
        
        const queryString = Utils.buildQueryString(params);
        const url = `${window.location.pathname}${queryString ? '?' + queryString : ''}`;
        
        const state = { project: projectId, file: fileId };
        
        try {
            window.history.replaceState(state, '', url);
            DEBUG.info(`URL replaced: ${url}`);
        } catch (error) {
            DEBUG.warn('Failed to replace URL:', error);
        }
    },
    
    /**
     * Go back to home/welcome screen or previous level
     */
    goBackToHome: function(updateHistory = true) {
        DEBUG.info('Navigating back to home');
        
        try {
            this.state.isNavigating = true;
            
            // If viewing a file, go back to project
            const currentFile = ContentRenderer ? ContentRenderer.getCurrentFile() : null;
            const currentProject = ProjectManager ? ProjectManager.getCurrentProject() : null;
            
            if (currentFile && currentProject) {
                DEBUG.info('Going back from file to project');
                // Clear file state
                if (ContentRenderer) ContentRenderer.clearCurrentFile();
                // Reload project view
                if (ProjectManager) ProjectManager.selectProject(currentProject);
                // Update URL to remove file parameter
                if (updateHistory) this.updateUrl(currentProject);
                this.state.currentRoute = { project: currentProject, file: null };
                return;
            }
            
            // Otherwise go to welcome screen
            this.showWelcome();
            
            // Clear navigation state
            this.state.currentRoute = {};
            
            // Reset URL
            if (updateHistory) {
                const url = window.location.pathname;
                window.history.pushState({}, '', url);
            }
            
        } catch (error) {
            DEBUG.reportError(error, 'Failed to navigate back');
        } finally {
            this.state.isNavigating = false;
        }
    },
    
    /**
     * Show welcome screen
     */
    showWelcome: function() {
        DEBUG.info('Showing welcome screen');
        
        // Clear states in other modules
        if (ProjectManager) ProjectManager.state.currentProject = null;
        if (ContentRenderer) ContentRenderer.clearCurrentFile();
        
        // Show welcome UI
        if (UI) {
            UI.showWelcomeScreen();
            UI.updatePageTitle(null);
        }
        
        // Remove project highlighting
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => item.classList.remove('active'));
    },
    
    /**
     * Handle internal link clicks
     */
    handleInternalLink: function(href) {
        try {
            const url = new URL(href, window.location.origin);
            const params = Utils.parseQueryString(url.search);
            
            if (params.project) {
                this.navigateToProject(params.project, params.file);
            } else {
                this.goBackToHome();
            }
        } catch (error) {
            DEBUG.error('Failed to handle internal link:', error);
        }
    },
    
    /**
     * Check if link is internal
     */
    isInternalLink: function(href) {
        try {
            const url = new URL(href, window.location.origin);
            return url.origin === window.location.origin && 
                   (url.pathname === window.location.pathname || url.pathname === '/');
        } catch (error) {
            return false;
        }
    },
    
    /**
     * Add to navigation history
     */
    addToNavigationHistory: function(route) {
        // Remove duplicate entries
        this.state.navigationHistory = this.state.navigationHistory.filter(
            item => !(item.project === route.project && item.file === route.file)
        );
        
        // Add to beginning
        this.state.navigationHistory.unshift({
            ...route,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.state.navigationHistory.length > this.config.maxHistorySize) {
            this.state.navigationHistory = this.state.navigationHistory.slice(0, this.config.maxHistorySize);
        }
    },
    
    /**
     * Get navigation history
     */
    getNavigationHistory: function() {
        return this.state.navigationHistory;
    },
    
    /**
     * Get current route
     */
    getCurrentRoute: function() {
        return this.state.currentRoute;
    },
    
    /**
     * Navigate back in history
     */
    navigateBack: function() {
        if (this.state.navigationHistory.length > 1) {
            // Skip current route (index 0) and go to previous (index 1)
            const previousRoute = this.state.navigationHistory[1];
            if (previousRoute) {
                this.navigateToProject(previousRoute.project, previousRoute.file);
            }
        } else {
            this.goBackToHome();
        }
    },
    
    /**
     * Navigate forward in browser history
     */
    navigateForward: function() {
        window.history.forward();
    },
    
    /**
     * Clear navigation history
     */
    clearHistory: function() {
        this.state.navigationHistory = [];
        DEBUG.info('Navigation history cleared');
    },
    
    /**
     * Get breadcrumb navigation
     */
    getBreadcrumbs: function() {
        const breadcrumbs = [];
        const route = this.state.currentRoute;
        
        // Home
        breadcrumbs.push({
            text: 'Home',
            route: {},
            isActive: !route.project
        });
        
        // Project
        if (route.project) {
            const project = ProjectManager ? ProjectManager.getProject(route.project) : null;
            const projectName = project ? 
                (project.name[UI.getCurrentLanguage()] || project.name.fi) : 
                route.project;
                
            breadcrumbs.push({
                text: projectName,
                route: { project: route.project },
                isActive: !route.file
            });
        }
        
        // File
        if (route.file) {
            breadcrumbs.push({
                text: Utils.filenameToDisplayName(route.file),
                route: route,
                isActive: true
            });
        }
        
        return breadcrumbs;
    },
    
    /**
     * Enable/disable push state
     */
    setPushStateEnabled: function(enabled) {
        this.config.pushStateEnabled = enabled;
        DEBUG.info(`Push state ${enabled ? 'enabled' : 'disabled'}`);
    },
    
    /**
     * Check if navigation is in progress
     */
    isNavigating: function() {
        return this.state.isNavigating;
    }
};

// Create global reference for backward compatibility
window.Navigation = {
    goBackToHome: function() {
        NavigationManager.goBackToHome();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('NavigationManager module loaded successfully');
    
    // Small delay to ensure other modules are ready
    setTimeout(() => {
        NavigationManager.init();
    }, 100);
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationManager;
}
