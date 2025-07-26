/**
 * Main Application Logic (Modularized)
 * Handles SPA coordination and delegates to specialized modules
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
    // Application state
    state: {
        currentProject: null,
        currentFile: null,
        projects: [],
        initialized: false
    },
    
    // Configuration
    config: {
        manifestUrl: 'manifest.json',
        projectsBasePath: 'projects/',
        defaultProject: 'indivisible-stochastic-processes'
    },
    
    /**
     * Initialize the application
     */
    init: function() {
        DEBUG.info('=== INITIALIZING APP ===');
        
        try {
            // Check for required dependencies
            if (!this.checkDependencies()) {
                DEBUG.warn('Dependencies not ready, retrying in 100ms...');
                setTimeout(() => this.init(), 100);
                return;
            }
            
            DEBUG.success('All dependencies loaded, proceeding with initialization');
            
            // Load manifest and set up app
            this.loadManifest()
                .then(() => {
                    DEBUG.info('Manifest loaded, setting up navigation');
                    this.setupEventListeners();
                    this.handleInitialRoute();
                    this.state.initialized = true;
                    DEBUG.success('=== APP INITIALIZED SUCCESSFULLY ===');
                })
                .catch(error => {
                    DEBUG.reportError(error, 'App initialization failed');
                    UI.showError('Failed to initialize application', false);
                });
                
        } catch (error) {
            DEBUG.reportError(error, 'Critical error during app initialization');
        }
    },
    
    /**
     * Check if all required dependencies are loaded
     */
    checkDependencies: function() {
        const required = ['ThemeManager', 'Utils', 'Storage', 'UI'];
        const missing = required.filter(dep => typeof window[dep] === 'undefined');
        
        if (missing.length > 0) {
            DEBUG.warn('Missing dependencies:', missing.join(', '));
            return false;
        }
        
        return true;
    },
    
    /**
     * Load manifest.json with projects list
     */
    loadManifest: async function() {
        DEBUG.info('Loading project manifest...');
        
        try {
            // Try to load from cache first
            const cached = Storage.getCachedProject('manifest');
            if (cached) {
                DEBUG.info('Using cached manifest');
                this.state.projects = cached.projects || [];
                this.renderProjectsList();
                return;
            }
            
            const response = await fetch(this.config.manifestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const manifest = await response.json();
            this.state.projects = manifest.projects || [];
            
            // Cache the manifest
            Storage.cacheProject('manifest', manifest, 60 * 60 * 1000); // 1 hour
            
            DEBUG.success(`Loaded ${this.state.projects.length} projects from manifest`);
            this.renderProjectsList();
            
        } catch (error) {
            DEBUG.error('Failed to load manifest, using fallback');
            // Fallback: use default project structure
            this.state.projects = [{
                id: 'indivisible-stochastic-processes',
                name: {
                    fi: 'Indivisible Stochastic Processes',
                    en: 'Indivisible Stochastic Processes'
                },
                description: {
                    fi: 'Tutkimus hybridijärjestelmien indivisible-käyttäytymisestä',
                    en: 'Research on hybrid systems indivisible behavior'
                }
            }];
            DEBUG.info('Using fallback project list');
            this.renderProjectsList();
        }
    },
    
    /**
     * Render projects list in navigation
     */
    renderProjectsList: function() {
        DEBUG.info('Rendering projects list...');
        const projectsList = document.querySelector(UI.selectors.projectsList);
        if (!projectsList) {
            DEBUG.error('Projects list element not found');
            return;
        }
        
        const currentLang = UI.getCurrentLanguage();
        projectsList.innerHTML = '';
        
        this.state.projects.forEach(project => {
            const projectElement = UI.createElement('div', {
                className: 'project-item',
                'data-project-id': project.id,
                onclick: () => this.selectProject(project.id)
            }, [
                UI.createElement('h3', {
                    className: 'project-title'
                }, [project.name[currentLang] || project.name.fi]),
                UI.createElement('p', {
                    className: 'project-description'
                }, [project.description[currentLang] || project.description.fi])
            ]);
            
            projectsList.appendChild(projectElement);
        });
        
        DEBUG.success(`Rendered ${this.state.projects.length} projects in navigation`);
    },
    
    /**
     * Select and load a project
     */
    selectProject: async function(projectId) {
        DEBUG.info(`=== SELECTING PROJECT: ${projectId} ===`);
        
        try {
            UI.showLoading();
            this.state.currentProject = projectId;
            
            // Update project highlighting
            UI.highlightActiveProject(projectId);
            
            // Add to recent projects
            const project = this.state.projects.find(p => p.id === projectId);
            if (project) {
                const currentLang = UI.getCurrentLanguage();
                Storage.addRecentProject(projectId, project.name[currentLang] || project.name.fi);
            }
            
            // Load project structure
            await this.loadProjectStructure(projectId);
            
            // Update URL and page title
            this.updateUrl(projectId);
            const projectName = project ? (project.name[UI.getCurrentLanguage()] || project.name.fi) : projectId;
            UI.updatePageTitle(projectName);
            
            UI.hideLoading();
            DEBUG.success(`Project ${projectId} loaded successfully`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to load project: ${projectId}`);
            UI.showError(`Failed to load project: ${projectId}`, true);
            UI.hideLoading();
        }
    },
    
    /**
     * Load project file structure
     */
    loadProjectStructure: async function(projectId) {
        DEBUG.info(`Loading project structure for: ${projectId}`);
        
        const currentLang = UI.getCurrentLanguage();
        const projectPath = `${this.config.projectsBasePath}${projectId}/${currentLang}/`;
        
        DEBUG.info(`Project path: ${projectPath}`);
        
        try {
            // Try to load project-specific manifest
            const projectManifestUrl = `${projectPath}manifest.json`;
            DEBUG.info(`Fetching: ${projectManifestUrl}`);
            
            const response = await fetch(projectManifestUrl);
            
            if (response.ok) {
                DEBUG.success('Project manifest loaded successfully');
                const projectManifest = await response.json();
                this.renderProjectContent(projectManifest, projectPath);
            } else {
                DEBUG.warn(`Project manifest not found (${response.status}), using basic structure`);
                this.renderBasicProjectStructure(projectId, projectPath);
            }
            
        } catch (error) {
            DEBUG.error(`Error loading project manifest: ${error.message}`);
            this.renderBasicProjectStructure(projectId, projectPath);
        }
    },
    
    /**
     * Render project content from manifest
     */
    renderProjectContent: function(manifest, basePath) {
        DEBUG.info('Rendering project content from manifest');
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
            DEBUG.error('Content area not found!');
            return;
        }
        
        const currentLang = UI.getCurrentLanguage();
        const backText = currentLang === 'fi' ? '← Takaisin etusivulle' : '← Back to Home';
        
        let html = `<div class="project-content">`;
        html += `
            <nav class="project-navigation">
                ${UI.createBackButton(backText)}
            </nav>
        `;
        html += `<h1>${Utils.escapeHtml(manifest.name || 'Project')}</h1>`;
        
        if (manifest.categories) {
            Object.entries(manifest.categories).forEach(([category, files]) => {
                html += this.renderCategory(category, files, basePath);
            });
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        DEBUG.success('Project content rendered successfully');
    },
    
    /**
     * Render basic project structure (fallback)
     */
    renderBasicProjectStructure: function(projectId, basePath) {
        DEBUG.info('Rendering basic project structure (fallback)');
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
            DEBUG.error('Content area not found!');
            return;
        }
        
        const currentLang = UI.getCurrentLanguage();
        const project = this.state.projects.find(p => p.id === projectId);
        const projectName = project ? (project.name[currentLang] || project.name.fi) : projectId;
        const backText = currentLang === 'fi' ? '← Takaisin etusivulle' : '← Back to Home';
        
        const categories = [
            { key: 'articles', name: currentLang === 'fi' ? 'Artikkelit' : 'Articles' },
            { key: 'documentation', name: currentLang === 'fi' ? 'Dokumentaatio' : 'Documentation' },
            { key: 'code', name: currentLang === 'fi' ? 'Koodi' : 'Code' },
            { key: 'results', name: currentLang === 'fi' ? 'Tulokset' : 'Results' },
            { key: 'downloads', name: currentLang === 'fi' ? 'Lataukset' : 'Downloads' }
        ];
        
        let html = `<div class="project-content">`;
        html += `
            <nav class="project-navigation">
                ${UI.createBackButton(backText)}
            </nav>
        `;
        html += `<h1>${Utils.escapeHtml(projectName)}</h1>`;
        html += `<p class="project-loading">Loading project files...</p>`;
        
        categories.forEach(category => {
            html += `
                <div class="category-section">
                    <h2>${Utils.escapeHtml(category.name)}</h2>
                    <div class="files-list" data-category="${category.key}" data-path="${basePath}${category.key}/">
                        <div class="loading-files">Loading files...</div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        DEBUG.success('Basic project structure rendered successfully');
    },
    
    /**
     * Render a category section
     */
    renderCategory: function(categoryName, files, basePath) {
        let html = `<div class="category-section">`;
        html += `<h2>${Utils.escapeHtml(categoryName)}</h2>`;
        html += `<div class="files-list">`;
        
        if (files && files.files) {
            files.files.forEach(file => {
                const fileName = file.name || file.filename || file;
                const filePath = `${basePath}${file.filename || file}`;
                
                html += `
                    <div class="file-item" data-file-path="${filePath}">
                        <span class="file-name">${Utils.escapeHtml(fileName)}</span>
                        <div class="file-actions">
                            <button class="view-btn" onclick="App.viewFile('${filePath}')">
                                ${UI.getCurrentLanguage() === 'fi' ? 'Katso' : 'View'}
                            </button>
                            <button class="download-btn" onclick="App.downloadFile('${filePath}')">
                                ${UI.getCurrentLanguage() === 'fi' ? 'Lataa' : 'Download'}
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div></div>`;
        return html;
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.project) {
                this.selectProject(e.state.project);
            } else {
                this.goBackToHome();
            }
        });
        
        DEBUG.info('Event listeners set up');
    },
    
    /**
     * Handle initial route on page load
     */
    handleInitialRoute: function() {
        const params = Utils.parseQueryString();
        const project = params.project;
        
        DEBUG.info(`Handling initial route. Project parameter: ${project}`);
        
        if (project) {
            setTimeout(() => {
                this.selectProject(project);
            }, 200);
        } else {
            UI.showWelcomeScreen();
        }
    },
    
    /**
     * Update URL without page reload
     */
    updateUrl: function(projectId, fileId = null) {
        const params = { project: projectId };
        if (fileId) params.file = fileId;
        
        const queryString = Utils.buildQueryString(params);
        const url = `${window.location.pathname}?${queryString}`;
        
        window.history.pushState(
            { project: projectId, file: fileId },
            '',
            url
        );
    },
    
    /**
     * Go back to home/welcome screen
     */
    goBackToHome: function() {
        DEBUG.info('Navigating back to home');
        
        this.state.currentProject = null;
        this.state.currentFile = null;
        
        // Reset URL
        const url = window.location.pathname;
        window.history.pushState({}, '', url);
        
        // Show welcome screen
        UI.showWelcomeScreen();
        UI.updatePageTitle(null);
        
        // Remove project highlighting
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => item.classList.remove('active'));
    },
    
    /**
     * View file (placeholder - will be implemented in file manager)
     */
    viewFile: function(filePath) {
        DEBUG.info(`Viewing file: ${filePath}`);
        UI.showNotification('File viewing will be implemented in next phase', 'info');
    },
    
    /**
     * Download file (placeholder)
     */
    downloadFile: function(filePath) {
        DEBUG.info(`Downloading file: ${filePath}`);
        UI.showNotification('File downloading will be implemented in next phase', 'info');
    }
};

// Create global reference for Navigation (backward compatibility)
window.Navigation = {
    goBackToHome: function() {
        App.goBackToHome();
    }
};

/**
 * Initialize app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other modules are ready
    setTimeout(() => {
        App.init();
    }, 200);
});

/**
 * Make App globally available
 */
window.App = App;
