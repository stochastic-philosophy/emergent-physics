/**
 * Main Application Logic
 * Handles SPA routing, project loading, and overall app coordination
 */

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
        DEBUG.info('Initializing App...');
        
        try {
            // Wait for theme manager to be ready
            if (typeof ThemeManager === 'undefined') {
                DEBUG.warn('ThemeManager not ready, retrying...');
                setTimeout(() => this.init(), 100);
                return;
            }
            
            // Load manifest and projects
            this.loadManifest()
                .then(() => {
                    this.setupEventListeners();
                    this.handleInitialRoute();
                    this.state.initialized = true;
                    DEBUG.success('App initialized successfully');
                })
                .catch(error => {
                    DEBUG.reportError(error, 'App initialization failed');
                    this.showError('Failed to initialize application');
                });
                
        } catch (error) {
            DEBUG.reportError(error, 'Critical error during app initialization');
        }
    },
    
    /**
     * Load manifest.json with projects list
     */
    loadManifest: async function() {
        DEBUG.info('Loading project manifest...');
        
        try {
            const response = await fetch(this.config.manifestUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const manifest = await response.json();
            this.state.projects = manifest.projects || [];
            
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
            this.renderProjectsList();
        }
    },
    
    /**
     * Render projects list in navigation
     */
    renderProjectsList: function() {
        const projectsList = document.getElementById('projects-list');
        if (!projectsList) {
            DEBUG.error('Projects list element not found');
            return;
        }
        
        const currentLang = ThemeManager.getLanguage();
        
        projectsList.innerHTML = '';
        
        this.state.projects.forEach(project => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            projectElement.innerHTML = `
                <h3 class="project-title">${project.name[currentLang] || project.name.fi}</h3>
                <p class="project-description">${project.description[currentLang] || project.description.fi}</p>
            `;
            
            projectElement.addEventListener('click', () => {
                this.selectProject(project.id);
            });
            
            projectsList.appendChild(projectElement);
        });
        
        DEBUG.info(`Rendered ${this.state.projects.length} projects`);
    },
    
    /**
     * Select and load a project
     */
    selectProject: async function(projectId) {
        DEBUG.info(`Selecting project: ${projectId}`);
        
        try {
            this.showLoading();
            this.state.currentProject = projectId;
            
            // Load project structure
            await this.loadProjectStructure(projectId);
            
            // Update URL without reload
            this.updateUrl(projectId);
            
            this.hideLoading();
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to load project: ${projectId}`);
            this.showError(`Failed to load project: ${projectId}`);
            this.hideLoading();
        }
    },
    
    /**
     * Load project file structure
     */
    loadProjectStructure: async function(projectId) {
        const currentLang = ThemeManager.getLanguage();
        const projectPath = `${this.config.projectsBasePath}${projectId}/${currentLang}/`;
        
        DEBUG.info(`Loading project structure from: ${projectPath}`);
        
        try {
            // Try to load project-specific manifest
            const projectManifestUrl = `${projectPath}manifest.json`;
            const response = await fetch(projectManifestUrl);
            
            if (response.ok) {
                const projectManifest = await response.json();
                this.renderProjectContent(projectManifest, projectPath);
            } else {
                // Fallback: create basic structure
                this.renderBasicProjectStructure(projectId, projectPath);
            }
            
        } catch (error) {
            DEBUG.warn('Project manifest not found, using basic structure');
            this.renderBasicProjectStructure(projectId, projectPath);
        }
    },
    
    /**
     * Render project content from manifest
     */
    renderProjectContent: function(manifest, basePath) {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;
        
        let html = `<div class="project-content">`;
        html += `<h1>${manifest.name || 'Project'}</h1>`;
        
        if (manifest.categories) {
            Object.entries(manifest.categories).forEach(([category, files]) => {
                html += this.renderCategory(category, files, basePath);
            });
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        this.setupFileClickHandlers();
    },
    
    /**
     * Render basic project structure (fallback)
     */
    renderBasicProjectStructure: function(projectId, basePath) {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;
        
        const currentLang = ThemeManager.getLanguage();
        const projectName = this.state.projects.find(p => p.id === projectId)?.name[currentLang] || projectId;
        
        const categories = [
            { key: 'articles', name: currentLang === 'fi' ? 'Artikkelit' : 'Articles' },
            { key: 'documentation', name: currentLang === 'fi' ? 'Dokumentaatio' : 'Documentation' },
            { key: 'code', name: currentLang === 'fi' ? 'Koodi' : 'Code' },
            { key: 'results', name: currentLang === 'fi' ? 'Tulokset' : 'Results' },
            { key: 'downloads', name: currentLang === 'fi' ? 'Lataukset' : 'Downloads' }
        ];
        
        let html = `<div class="project-content">`;
        html += `<h1>${projectName}</h1>`;
        html += `<p class="project-loading">Loading project files...</p>`;
        
        categories.forEach(category => {
            html += `
                <div class="category-section">
                    <h2>${category.name}</h2>
                    <div class="files-list" data-category="${category.key}" data-path="${basePath}${category.key}/">
                        <div class="loading-files">Loading files...</div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        // Try to load files for each category
        this.loadCategoryFiles(basePath);
    },
    
    /**
     * Load files for each category
     */
    loadCategoryFiles: async function(basePath) {
        const categories = document.querySelectorAll('.files-list[data-category]');
        
        for (const categoryElement of categories) {
            const category = categoryElement.getAttribute('data-category');
            const categoryPath = categoryElement.getAttribute('data-path');
            
            try {
                await this.loadFilesForCategory(categoryElement, categoryPath);
            } catch (error) {
                DEBUG.warn(`Failed to load files for category: ${category}`);
                categoryElement.innerHTML = '<p class="no-files">No files found in this category.</p>';
            }
        }
    },
    
    /**
     * Load files for a specific category (this is a simulation - real implementation would need server support)
     */
    loadFilesForCategory: async function(categoryElement, categoryPath) {
        // Since we can't list directory contents on static GitHub Pages,
        // we'll need to rely on manifest files or predefined file lists
        
        // For now, show placeholder
        categoryElement.innerHTML = `
            <p class="category-placeholder">
                Files in this category will be loaded dynamically.<br>
                <small>Path: ${categoryPath}</small>
            </p>
        `;
    },
    
    /**
     * Render a category section
     */
    renderCategory: function(categoryName, files, basePath) {
        let html = `<div class="category-section">`;
        html += `<h2>${categoryName}</h2>`;
        html += `<div class="files-list">`;
        
        files.forEach(file => {
            const fileName = file.name || file;
            const filePath = `${basePath}${file.path || file}`;
            
            html += `
                <div class="file-item" data-file-path="${filePath}">
                    <span class="file-name">${fileName}</span>
                    <div class="file-actions">
                        <button class="view-btn" onclick="App.viewFile('${filePath}')">View</button>
                        <button class="download-btn" onclick="App.downloadFile('${filePath}')">Download</button>
                    </div>
                </div>
            `;
        });
        
        html += `</div></div>`;
        return html;
    },
    
    /**
     * Setup event listeners
     */
    setupEventListeners: function() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        DEBUG.info('Event listeners set up');
    },
    
    /**
     * Setup file click handlers
     */
    setupFileClickHandlers: function() {
        // This will be called after rendering content with file links
        DEBUG.info('File click handlers set up');
    },
    
    /**
     * Handle initial route
     */
    handleInitialRoute: function() {
        const urlParams = new URLSearchParams(window.location.search);
        const project = urlParams.get('project');
        
        if (project) {
            this.selectProject(project);
        } else {
            // Show welcome screen
            DEBUG.info('Showing welcome screen');
        }
    },
    
    /**
     * Handle popstate (back/forward navigation)
     */
    handlePopState: function(event) {
        if (event.state) {
            this.selectProject(event.state.project);
        }
    },
    
    /**
     * Handle window resize
     */
    handleResize: function() {
        // Responsive adjustments if needed
    },
    
    /**
     * Update URL without page reload
     */
    updateUrl: function(projectId, fileId = null) {
        const url = new URL(window.location);
        url.searchParams.set('project', projectId);
        
        if (fileId) {
            url.searchParams.set('file', fileId);
        } else {
            url.searchParams.delete('file');
        }
        
        window.history.pushState(
            { project: projectId, file: fileId },
            '',
            url.toString()
        );
    },
    
    /**
     * Show loading overlay
     */
    showLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    },
    
    /**
     * Hide loading overlay
     */
    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },
    
    /**
     * Show error message
     */
    showError: function(message) {
        const contentArea = document.getElementById('main-content');
        if (contentArea) {
            contentArea.innerHTML = `
                <div class="error-message">
                    <h2>Error</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    },
    
    /**
     * View file (placeholder - will be implemented in file manager)
     */
    viewFile: function(filePath) {
        DEBUG.info(`Viewing file: ${filePath}`);
        // This will be implemented in file-manager.js
    },
    
    /**
     * Download file (placeholder)
     */
    downloadFile: function(filePath) {
        DEBUG.info(`Downloading file: ${filePath}`);
        // This will be implemented in file-manager.js
    }
};

/**
 * Initialize app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other managers are ready
    setTimeout(() => {
        App.init();
    }, 200);
});

/**
 * Make App globally available
 */
window.App = App;
