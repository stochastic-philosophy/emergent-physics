/**
 * Main Application Logic
 * Handles SPA routing, project loading, and overall app coordination
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
                DEBUG.warn('ThemeManager not ready, retrying in 100ms...');
                setTimeout(() => this.init(), 100);
                return;
            }
            
            DEBUG.success('ThemeManager found, proceeding with initialization');
            
            // Load manifest and projects
            this.loadManifest()
                .then(() => {
                    DEBUG.info('Manifest loaded, setting up event listeners');
                    this.setupEventListeners();
                    DEBUG.info('Event listeners set up, handling initial route');
                    this.handleInitialRoute();
                    this.state.initialized = true;
                    DEBUG.success('App initialized successfully');
                })
                .catch(error => {
                    DEBUG.reportError(error, 'App initialization failed');
                    this.showErrorWithBackButton('Failed to initialize application');
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
            DEBUG.info('Using fallback project list');
            this.renderProjectsList();
        }
    },
    
    /**
     * Render projects list in navigation
     */
    renderProjectsList: function() {
        DEBUG.info('Rendering projects list...');
        const projectsList = document.getElementById('projects-list');
        if (!projectsList) {
            DEBUG.error('Projects list element not found');
            return;
        }
        
        const currentLang = ThemeManager ? ThemeManager.getLanguage() : 'fi';
        
        projectsList.innerHTML = '';
        
        this.state.projects.forEach(project => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            projectElement.innerHTML = `
                <h3 class="project-title">${project.name[currentLang] || project.name.fi}</h3>
                <p class="project-description">${project.description[currentLang] || project.description.fi}</p>
            `;
            
            projectElement.addEventListener('click', () => {
                DEBUG.info(`Project clicked: ${project.id}`);
                this.selectProject(project.id);
            });
            
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
            this.showLoading();
            this.state.currentProject = projectId;
            
            DEBUG.info('Updating project highlighting...');
            
            // Update project item highlighting
            const projectItems = document.querySelectorAll('.project-item');
            projectItems.forEach(item => {
                item.classList.remove('active');
                // Check if this project item corresponds to the selected project
                const projectTitle = item.querySelector('.project-title');
                if (projectTitle) {
                    const currentLang = ThemeManager.getLanguage();
                    const project = this.state.projects.find(p => p.id === projectId);
                    if (project && projectTitle.textContent.trim() === (project.name[currentLang] || project.name.fi)) {
                        item.classList.add('active');
                        DEBUG.info(`Highlighted project: ${project.name[currentLang] || project.name.fi}`);
                    }
                }
            });
            
            DEBUG.info('Starting project structure loading...');
            
            // Load project structure
            await this.loadProjectStructure(projectId);
            
            // Update URL without reload
            this.updateUrl(projectId);
            
            this.hideLoading();
            DEBUG.success(`Project ${projectId} loaded successfully`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to load project: ${projectId}`);
            this.showErrorWithBackButton(`Failed to load project: ${projectId}`);
            this.hideLoading();
        }
    },
    
    /**
     * Load project file structure
     */
    loadProjectStructure: async function(projectId) {
        DEBUG.info(`Starting to load project structure for: ${projectId}`);
        
        // Ensure ThemeManager is available
        if (typeof ThemeManager === 'undefined' || !ThemeManager.getLanguage) {
            DEBUG.error('ThemeManager not available during project loading');
            this.showErrorWithBackButton('ThemeManager not ready');
            return;
        }
        
        const currentLang = ThemeManager.getLanguage();
        const projectPath = `${this.config.projectsBasePath}${projectId}/${currentLang}/`;
        
        DEBUG.info(`Loading project structure from: ${projectPath}`);
        DEBUG.info(`Current language: ${currentLang}`);
        
        try {
            // Try to load project-specific manifest
            const projectManifestUrl = `${projectPath}manifest.json`;
            DEBUG.info(`Attempting to fetch: ${projectManifestUrl}`);
            
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
        const contentArea = document.getElementById('main-content');
        if (!contentArea) {
            DEBUG.error('Content area not found!');
            return;
        }
        
        const currentLang = ThemeManager ? ThemeManager.getLanguage() : 'fi';
        const backText = currentLang === 'fi' ? '← Takaisin etusivulle' : '← Back to Home';
        
        let html = `<div class="project-content">`;
        
        // Add back to home navigation
        html += `
            <nav class="project-navigation">
                <button class="back-to-home-btn" onclick="App.goBackToHome()">
                    ${backText}
                </button>
            </nav>
        `;
        
        html += `<h1>${manifest.name || 'Project'}</h1>`;
        
        if (manifest.categories) {
            Object.entries(manifest.categories).forEach(([category, files]) => {
                html += this.renderCategory(category, files, basePath);
            });
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        DEBUG.success('Project content rendered successfully');
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
        
        // Add back to home navigation
        html += `
            <nav class="project-navigation">
                <button class="back-to-home-btn" onclick="App.goBackToHome()">
                    ← ${currentLang === 'fi' ? 'Takaisin etusivulle' : 'Back to Home'}
                </button>
            </nav>
        `;
        
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
        
        DEBUG.info(`Handling initial route. Project parameter: ${project}`);
        
        if (project) {
            // Small delay to ensure everything is loaded
            setTimeout(() => {
                this.selectProject(project);
            }, 200);
        } else {
            // Show welcome screen
            DEBUG.info('Showing welcome screen');
            this.showWelcomeScreen();
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
     * Show welcome screen
     */
    showWelcomeScreen: function() {
        DEBUG.info('Displaying welcome screen');
        const contentArea = document.getElementById('main-content');
        if (!contentArea) {
            DEBUG.error('Content area not found for welcome screen!');
            return;
        }
        
        const currentLang = ThemeManager && ThemeManager.getLanguage ? ThemeManager.getLanguage() : 'fi';
        const welcomeTitle = currentLang === 'fi' ? 'Tervetuloa tutkimusalustalle' : 'Welcome to Research Platform';
        const welcomeDesc = currentLang === 'fi' ? 
            'Valitse vasemmalta projekti aloittaaksesi tutustumisen tutkimustuloksiin.' :
            'Select a project from the left to start exploring research results.';
        const statusTheme = currentLang === 'fi' ? 'Teema' : 'Theme';
        const statusLang = currentLang === 'fi' ? 'Kieli' : 'Language';
        
        let currentTheme = 'Unknown';
        let currentLanguage = 'Unknown';
        
        if (ThemeManager && ThemeManager.getTheme) {
            const theme = ThemeManager.getTheme();
            currentTheme = currentLang === 'fi' ? 
                (theme === 'light' ? 'Vaalea' : 'Tumma') :
                (theme === 'light' ? 'Light' : 'Dark');
        }
        
        if (currentLang) {
            currentLanguage = currentLang === 'fi' ? 'Suomi' : 'English';
        }
        
        contentArea.innerHTML = `
            <div class="welcome-screen">
                <h1 data-key="welcome_title">${welcomeTitle}</h1>
                <p data-key="welcome_description">${welcomeDesc}</p>
                
                <div class="status-indicator">
                    <div class="status-item">
                        <span data-key="status_theme">${statusTheme}:</span>
                        <span id="current-theme-display">${currentTheme}</span>
                    </div>
                    <div class="status-item">
                        <span data-key="status_language">${statusLang}:</span>
                        <span id="current-language-display">${currentLanguage}</span>
                    </div>
                </div>
            </div>
        `;
        
        DEBUG.success('Welcome screen displayed successfully');
    },
    
    /**
     * Show error with back button
     */
    showErrorWithBackButton: function(message) {
        const contentArea = document.getElementById('main-content');
        if (!contentArea) return;
        
        const currentLang = ThemeManager ? ThemeManager.getLanguage() : 'fi';
        const backText = currentLang === 'fi' ? '← Takaisin etusivulle' : '← Back to Home';
        const errorTitle = currentLang === 'fi' ? 'Virhe' : 'Error';
        const reloadText = currentLang === 'fi' ? 'Päivitä sivu' : 'Reload Page';
        
        contentArea.innerHTML = `
            <div class="project-content">
                <nav class="project-navigation">
                    <button class="back-to-home-btn" onclick="App.goBackToHome()">
                        ${backText}
                    </button>
                </nav>
                <div class="error-message">
                    <h2>${errorTitle}</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">${reloadText}</button>
                </div>
            </div>
        `;
        
        DEBUG.error(`Error displayed: ${message}`);
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
    },
    
    /**
     * Go back to home/welcome screen
     */
    goBackToHome: function() {
        DEBUG.info('Navigating back to home');
        
        // Clear current project state
        this.state.currentProject = null;
        this.state.currentFile = null;
        
        // Reset URL
        const url = new URL(window.location);
        url.searchParams.delete('project');
        url.searchParams.delete('file');
        window.history.pushState({}, '', url.toString());
        
        // Show welcome screen
        const contentArea = document.getElementById('main-content');
        if (contentArea) {
            const currentLang = ThemeManager.getLanguage();
            const welcomeTitle = currentLang === 'fi' ? 'Tervetuloa tutkimusalustalle' : 'Welcome to Research Platform';
            const welcomeDesc = currentLang === 'fi' ? 
                'Valitse vasemmalta projekti aloittaaksesi tutustumisen tutkimustuloksiin.' :
                'Select a project from the left to start exploring research results.';
            const statusTheme = currentLang === 'fi' ? 'Teema' : 'Theme';
            const statusLang = currentLang === 'fi' ? 'Kieli' : 'Language';
            const currentTheme = currentLang === 'fi' ? 
                (ThemeManager.getTheme() === 'light' ? 'Vaalea' : 'Tumma') :
                (ThemeManager.getTheme() === 'light' ? 'Light' : 'Dark');
            const currentLanguage = currentLang === 'fi' ? 'Suomi' : 'English';
            
            contentArea.innerHTML = `
                <div class="welcome-screen">
                    <h1>${welcomeTitle}</h1>
                    <p>${welcomeDesc}</p>
                    
                    <div class="status-indicator">
                        <div class="status-item">
                            <span>${statusTheme}:</span>
                            <span id="current-theme-display">${currentTheme}</span>
                        </div>
                        <div class="status-item">
                            <span>${statusLang}:</span>
                            <span id="current-language-display">${currentLanguage}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Update project list highlighting
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            item.classList.remove('active');
        });
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
