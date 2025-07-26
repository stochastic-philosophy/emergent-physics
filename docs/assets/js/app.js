/**
 * Main Application Logic (Modularized + Phase 2 File Management)
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
        DEBUG.info('=== INITIALIZING APP (Phase 2) ===');
        
        try {
            // Check for required dependencies (including new Phase 2 modules)
            if (!this.checkDependencies()) {
                DEBUG.warn('Dependencies not ready, retrying in 100ms...');
                setTimeout(() => this.init(), 100);
                return;
            }
            
            DEBUG.success('All dependencies loaded, proceeding with initialization');
            
            // Preload Markdown Processor libraries
            this.preloadLibraries()
                .then(() => {
                    DEBUG.info('CDN libraries preloaded');
                    return this.loadManifest();
                })
                .then(() => {
                    DEBUG.info('Manifest loaded, setting up navigation');
                    this.setupEventListeners();
                    this.handleInitialRoute();
                    this.state.initialized = true;
                    DEBUG.success('=== APP INITIALIZED SUCCESSFULLY (Phase 2) ===');
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
     * Check if all required dependencies are loaded (Phase 2)
     */
    checkDependencies: function() {
        const required = ['ThemeManager', 'Utils', 'Storage', 'UI', 'FileManager', 'MarkdownProcessor'];
        const missing = required.filter(dep => typeof window[dep] === 'undefined');
        
        if (missing.length > 0) {
            DEBUG.warn('Missing dependencies:', missing.join(', '));
            return false;
        }
        
        return true;
    },
    
    /**
     * Preload CDN libraries for better performance
     */
    preloadLibraries: async function() {
        DEBUG.info('Preloading CDN libraries...');
        
        try {
            // Initialize MarkdownProcessor (loads Marked, MathJax, Prism)
            await MarkdownProcessor.init();
            DEBUG.success('Markdown processor libraries loaded');
        } catch (error) {
            DEBUG.warn('Failed to preload some libraries:', error);
            // Continue anyway - libraries will load on demand
        }
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
                    fi: 'Indivisible Stochastic Processes 1',
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
            this.state.currentFile = null; // Reset file state
            
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
        
        if (manifest.description) {
            html += `<p class="project-description">${Utils.escapeHtml(manifest.description)}</p>`;
        }
        
        if (manifest.categories) {
            Object.entries(manifest.categories).forEach(([categoryKey, categoryData]) => {
                html += this.renderCategory(categoryKey, categoryData, basePath);
            });
        }
        
        html += `</div>`;
        contentArea.innerHTML = html;
        
        DEBUG.success('Project content rendered successfully');
        
        // Load file lists for each category
        this.loadCategoryFiles(manifest, basePath);
    },
    
    /**
     * Load files for each category using FileManager
     */
    loadCategoryFiles: async function(manifest, basePath) {
        if (!manifest.categories) return;
        
        for (const [categoryKey, categoryData] of Object.entries(manifest.categories)) {
            try {
                const categoryElement = document.querySelector(`[data-category="${categoryKey}"]`);
                if (categoryElement) {
                    categoryElement.innerHTML = '<div class="loading-files">Loading files...</div>';
                    
                    const filesList = await FileManager.listCategoryFiles(basePath, categoryKey, manifest);
                    this.renderCategoryFiles(categoryElement, filesList, basePath);
                }
            } catch (error) {
                DEBUG.error(`Failed to load files for category ${categoryKey}:`, error);
                const categoryElement = document.querySelector(`[data-category="${categoryKey}"]`);
                if (categoryElement) {
                    categoryElement.innerHTML = '<div class="error-loading">Failed to load files</div>';
                }
            }
        }
    },
    
    /**
     * Render files for a category
     */
    renderCategoryFiles: function(categoryElement, filesList, basePath) {
        if (!filesList || !filesList.files || filesList.files.length === 0) {
            categoryElement.innerHTML = '<div class="no-files">No files available</div>';
            return;
        }
        
        const currentLang = UI.getCurrentLanguage();
        let html = '';
        
        filesList.files.forEach(file => {
            const fileName = file.filename || file.name;
            const displayName = file.name || Utils.filenameToDisplayName(fileName);
            const description = file.description || '';
            const filePath = file.path || `${basePath}${fileName}`;
            const fileType = file.type || FileManager.detectFileType(fileName);
            
            html += `
                <div class="file-item" data-file-path="${filePath}">
                    <div class="file-info">
                        <div class="file-header">
                            <span class="file-name">${Utils.escapeHtml(displayName)}</span>
                            <span class="file-type-badge file-type-${fileType}">${fileType}</span>
                        </div>
                        ${description ? `<div class="file-description">${Utils.escapeHtml(description)}</div>` : ''}
                        ${file.tags && file.tags.length > 0 ? `<div class="file-tags">${file.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
                    </div>
                    <div class="file-actions">
                        ${FileManager.isViewable(fileName) ? `
                            <button class="view-btn" onclick="App.viewFile('${filePath}')">
                                ${currentLang === 'fi' ? '👁️ Katso' : '👁️ View'}
                            </button>
                        ` : ''}
                        ${FileManager.isDownloadable(fileName) ? `
                            <button class="download-btn" onclick="App.downloadFile('${filePath}')">
                                ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        categoryElement.innerHTML = html;
        DEBUG.info(`Rendered ${filesList.files.length} files for category`);
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
    renderCategory: function(categoryName, categoryData, basePath) {
        const displayName = categoryData.name || Utils.filenameToDisplayName(categoryName);
        const description = categoryData.description || '';
        
        let html = `<div class="category-section">`;
        html += `<div class="category-header">`;
        html += `<h2>${Utils.escapeHtml(displayName)}</h2>`;
        if (description) {
            html += `<p class="category-description">${Utils.escapeHtml(description)}</p>`;
        }
        html += `</div>`;
        html += `<div class="files-list" data-category="${categoryName}" data-path="${basePath}${categoryName}/">`;
        html += `<div class="loading-files">Loading files...</div>`;
        html += `</div></div>`;
        
        return html;
    },
    
    /**
     * View file content (NEW in Phase 2)
     */
    viewFile: async function(filePath) {
        DEBUG.info(`=== VIEWING FILE: ${filePath} ===`);
        
        try {
            UI.showLoading('Loading file content...');
            
            // Detect file type
            const fileType = FileManager.detectFileType(filePath);
            DEBUG.info(`File type detected: ${fileType}`);
            
            // Check if file is viewable
            if (!FileManager.isViewable(filePath)) {
                UI.hideLoading();
                UI.showError(`File type not supported for viewing: ${fileType}`, true);
                return;
            }
            
            // Load file content
            const content = await FileManager.loadFile(filePath);
            
            // Update state
            this.state.currentFile = filePath;
            
            // Render content based on file type
            await this.renderFileContent(content, fileType, filePath);
            
            // Update URL
            const projectId = this.state.currentProject;
            const fileName = filePath.split('/').pop();
            this.updateUrl(projectId, fileName);
            
            // Update page title
            const displayName = Utils.filenameToDisplayName(fileName);
            UI.updatePageTitle(`${displayName} - ${projectId}`);
            
            UI.hideLoading();
            DEBUG.success(`File viewing completed: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to view file: ${filePath}`);
            UI.hideLoading();
            UI.showError(`Failed to load file: ${error.message}`, true);
        }
    },
    
    /**
     * Render file content based on type (NEW in Phase 2)
     */
    renderFileContent: async function(content, fileType, filePath) {
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
            throw new Error('Content area not found');
        }
        
        const currentLang = UI.getCurrentLanguage();
        const backText = currentLang === 'fi' ? '← Takaisin projektiin' : '← Back to Project';
        const fileName = filePath.split('/').pop();
        const displayName = Utils.filenameToDisplayName(fileName);
        
        let html = `<div class="file-content">`;
        html += `
            <nav class="file-navigation">
                ${UI.createBackButton(backText)}
                <div class="file-info">
                    <h1>${Utils.escapeHtml(displayName)}</h1>
                    <span class="file-type-badge">${fileType}</span>
                </div>
                <div class="file-actions">
                    <button onclick="App.downloadFile('${filePath}')" class="download-file-btn">
                        ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                    </button>
                </div>
            </nav>
        `;
        
        // Render content based on file type
        switch (fileType) {
            case 'markdown':
                html += '<div class="markdown-content">';
                html += await MarkdownProcessor.processCombined(content);
                html += '</div>';
                break;
                
            case 'code':
                const language = this.detectCodeLanguage(fileName);
                html += `<div class="code-content">`;
                html += `<pre class="language-${language}"><code class="language-${language}">${Utils.escapeHtml(content)}</code></pre>`;
                html += `</div>`;
                break;
                
            case 'data':
                if (fileName.endsWith('.json')) {
                    try {
                        const jsonData = typeof content === 'string' ? JSON.parse(content) : content;
                        html += `<div class="json-content">`;
                        html += `<pre class="language-json"><code class="language-json">${Utils.escapeHtml(JSON.stringify(jsonData, null, 2))}</code></pre>`;
                        html += `</div>`;
                    } catch (e) {
                        html += `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
                    }
                } else {
                    html += `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
                }
                break;
                
            default:
                html += `<div class="text-content"><pre>${Utils.escapeHtml(content)}</pre></div>`;
        }
        
        html += `</div>`;
        
        contentArea.innerHTML = html;
        
        // Apply syntax highlighting if needed
        if (fileType === 'code' || (fileType === 'data' && fileName.endsWith('.json'))) {
            MarkdownProcessor.highlightCode(contentArea);
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
    },
    
    /**
     * Detect programming language from filename
     */
    detectCodeLanguage: function(fileName) {
        const extension = Utils.getFileExtension(fileName);
        const languageMap = {
            'py': 'python',
            'js': 'javascript',
            'r': 'r',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'md': 'markdown',
            'sh': 'bash',
            'txt': 'text'
        };
        
        return languageMap[extension] || 'text';
    },
    
    /**
     * Download file (NEW in Phase 2)
     */
    downloadFile: async function(filePath) {
        DEBUG.info(`=== DOWNLOADING FILE: ${filePath} ===`);
        
        try {
            // Check if file is downloadable
            if (!FileManager.isDownloadable(filePath)) {
                const fileName = filePath.split('/').pop();
                UI.showNotification(`File type not supported for download: ${Utils.getFileExtension(fileName)}`, 'warning');
                return;
            }
            
            await FileManager.downloadFile(filePath);
            DEBUG.success(`File download completed: ${filePath}`);
            
        } catch (error) {
            DEBUG.reportError(error, `Failed to download file: ${filePath}`);
            UI.showNotification('Failed to download file', 'error');
        }
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
        const file = params.file;
        
        DEBUG.info(`Handling initial route. Project: ${project}, File: ${file}`);
        
        if (project) {
            setTimeout(() => {
                this.selectProject(project).then(() => {
                    if (file) {
                        // Try to find and view the file
                        const filePath = this.findFileInProject(file);
                        if (filePath) {
                            this.viewFile(filePath);
                        }
                    }
                });
            }, 200);
        } else {
            UI.showWelcomeScreen();
        }
    },
    
    /**
     * Find file in current project
     */
    findFileInProject: function(fileName) {
        // This is a simple implementation - could be improved
        const currentLang = UI.getCurrentLanguage();
        const projectPath = `${this.config.projectsBasePath}${this.state.currentProject}/${currentLang}/`;
        
        // Try common paths
        const commonPaths = [
            `${projectPath}documentation/${fileName}`,
            `${projectPath}articles/${fileName}`,
            `${projectPath}code/${fileName}`,
            `${projectPath}results/${fileName}`
        ];
        
        return commonPaths[0]; // Return first guess for now
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
     * Go back to home/welcome screen or previous level
     */
    goBackToHome: function() {
        DEBUG.info('Navigating back');
        
        // If viewing a file, go back to project
        if (this.state.currentFile && this.state.currentProject) {
            this.state.currentFile = null;
            this.selectProject(this.state.currentProject);
            return;
        }
        
        // Otherwise go to home
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
