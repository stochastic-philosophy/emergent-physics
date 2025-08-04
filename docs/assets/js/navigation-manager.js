/**
 * Navigation Manager - URL-navigaatio ja historia + Scroll Position Muisti
 * Handles URL routing, browser history, navigation events and scroll position restoration
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.NavigationManager = {
    
    // State specific to navigation
    state: {
        currentRoute: {},
        navigationHistory: [],
        isNavigating: false,
        scrollPositions: new Map() // Uusi: scroll position muisti
    },
    
    // Configuration
    config: {
        maxHistorySize: 50,
        pushStateEnabled: true,
        scrollRestoreDelay: 200 // Viive scroll palauttamiselle
    },
    
    /**
     * Initialize NavigationManager
     */
    init: function() {
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
        
        // UUSI: Tallenna scroll position kun sivu vieritetään
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.saveCurrentScrollPosition();
            }, 150); // Debounce scroll tallennusta
        });
    },
    
    /**
     * UUSI: Tallenna nykyinen scroll position
     */
    saveCurrentScrollPosition: function() {
        const currentProject = ProjectManager ? ProjectManager.getCurrentProject() : null;
        const currentFile = ContentRenderer ? ContentRenderer.getCurrentFile() : null;
        
        if (currentProject) {
            const scrollY = window.scrollY || window.pageYOffset;
            const key = currentFile ? `${currentProject}:${currentFile}` : currentProject;
            
            this.state.scrollPositions.set(key, {
                scrollY: scrollY,
                timestamp: Date.now(),
                url: window.location.href
            });
            
            // Debug: näytä popup jos debug mode on
            if (window.DEBUG_MODE && localStorage.getItem('show_scroll_debug') === 'true') {
                this.showScrollDebug(`💾 Saved scroll: ${key} → ${scrollY}px`);
            }
        }
    },
    
    /**
     * UUSI: Palauta scroll position
     */
    restoreScrollPosition: function(projectId, fileId = null) {
        const key = fileId ? `${projectId}:${fileId}` : projectId;
        const saved = this.state.scrollPositions.get(key);
        
        if (saved) {
            // Käytä timeoutia varmistamaan että DOM on valmis
            setTimeout(() => {
                window.scrollTo({
                    top: saved.scrollY,
                    behavior: 'smooth'
                });
                
                // Debug popup
                if (window.DEBUG_MODE && localStorage.getItem('show_scroll_debug') === 'true') {
                    this.showScrollDebug(`📖 Restored scroll: ${key} → ${saved.scrollY}px`);
                }
            }, this.config.scrollRestoreDelay);
            
            return true;
        }
        
        return false;
    },
    
    /**
     * UUSI: Debug popup scroll toiminnoille
     */
    showScrollDebug: function(message) {
        if (UI && UI.showNotification) {
            UI.showNotification(message, 'info', 3000);
        }
    },
    
    /**
     * Handle initial route on page load
     */
    handleInitialRoute: function() {
        const params = Utils.parseQueryString();
        const project = params.project;
        const file = params.file;
        
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
     * Navigate to project with optional file + scroll restoration
     */
    navigateToProject: async function(projectId, fileId = null, updateHistory = true) {
        try {
            this.state.isNavigating = true;
            
            // UUSI: Tallenna nykyinen scroll position ennen navigointia
            this.saveCurrentScrollPosition();
            
            // Load project first
            if (typeof ProjectManager !== 'undefined') {
                await ProjectManager.selectProject(projectId);
                
                // UUSI: Palauta scroll position projektille (jos ei mennä tiedostoon)
                if (!fileId) {
                    // Pieni viive varmistamaan että projekti on ladattu
                    setTimeout(() => {
                        this.restoreScrollPosition(projectId);
                    }, this.config.scrollRestoreDelay + 100);
                }
            }
            
            // Then load file if specified
            if (fileId && typeof ContentRenderer !== 'undefined') {
                const filePath = ProjectManager.findFileInProject(fileId);
                if (filePath) {
                    await ContentRenderer.viewFile(filePath);
                    // Tiedostonäkymässä scroll alkaa aina ylhäältä
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
            // Silent error handling
        } finally {
            this.state.isNavigating = false;
        }
    },
    
    /**
     * Navigate to file within current project + tallenna scroll position
     */
    navigateToFile: async function(filePath, updateHistory = true) {
        try {
            this.state.isNavigating = true;
            
            // UUSI: Tallenna scroll position ENNEN tiedostoon siirtymistä
            this.saveCurrentScrollPosition();
            
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
            // Silent error handling
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
        } catch (error) {
            // Silent error handling
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
        } catch (error) {
            // Silent error handling
        }
    },
    
    /**
     * Go back to home/welcome screen or previous level + SCROLL RESTORATION
     */
    goBackToHome: function(updateHistory = true) {
        try {
            this.state.isNavigating = true;
            
            // If viewing a file, go back to project WITH SCROLL RESTORATION
            const currentFile = ContentRenderer ? ContentRenderer.getCurrentFile() : null;
            const currentProject = ProjectManager ? ProjectManager.getCurrentProject() : null;
            
            if (currentFile && currentProject) {
                // MUUTETTU: Palaa projektiin ja palauta scroll position
                
                // Clear file state
                if (ContentRenderer) ContentRenderer.clearCurrentFile();
                
                // Reload project view
                if (ProjectManager) {
                    ProjectManager.selectProject(currentProject).then(() => {
                        // UUSI: Palauta scroll position projektin lataamisen jälkeen
                        setTimeout(() => {
                            const restored = this.restoreScrollPosition(currentProject);
                            
                            if (window.DEBUG_MODE && localStorage.getItem('show_scroll_debug') === 'true') {
                                this.showScrollDebug(restored ? 
                                    `🔙 Back to project + scroll restored` : 
                                    `🔙 Back to project (no saved scroll)`
                                );
                            }
                        }, this.config.scrollRestoreDelay);
                    });
                }
                
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
            // Silent error handling
        } finally {
            this.state.isNavigating = false;
        }
    },
    
    /**
     * Show welcome screen
     */
    showWelcome: function() {
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
        
        // Scroll to top for welcome screen
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            // Silent error handling
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
     * Clear navigation history + scroll positions
     */
    clearHistory: function() {
        this.state.navigationHistory = [];
        this.state.scrollPositions.clear(); // UUSI: tyhjennä myös scroll muisti
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
    },
    
    /**
     * Check if navigation is in progress
     */
    isNavigating: function() {
        return this.state.isNavigating;
    },
    
    /**
     * UUSI: Get scroll debug info
     */
    getScrollDebugInfo: function() {
        const positions = {};
        for (const [key, value] of this.state.scrollPositions) {
            positions[key] = {
                scrollY: value.scrollY,
                age: Date.now() - value.timestamp,
                url: value.url
            };
        }
        
        return {
            savedPositions: positions,
            currentScroll: window.scrollY,
            currentProject: ProjectManager ? ProjectManager.getCurrentProject() : null,
            currentFile: ContentRenderer ? ContentRenderer.getCurrentFile() : null
        };
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
