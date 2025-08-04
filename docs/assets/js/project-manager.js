/**
 * Project Manager - Projektien hallinta ja navigaatio + Scroll Position Tuki
 * Handles project loading, manifest processing, and project-level navigation with scroll memory
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.ProjectManager = {
    
    // Configuration
    config: {
        manifestUrl: 'manifest.json',
        projectsBasePath: 'projects/',
        defaultProject: 'indivisible-stochastic-processes'
    },
    
    // State specific to project management
    state: {
        projects: [],
        currentProject: null,
        projectCache: new Map(),
        lastScrollPosition: null // UUSI: muista viimeinen scroll position
    },
    
    /**
     * Initialize ProjectManager
     */
    init: function() {
        this.loadManifest();
    },
    
    /**
     * Load manifest.json with projects list
     */
    loadManifest: async function() {
        try {
            // Try to load from cache first
            const cached = Storage.getCachedProject('manifest');
            if (cached) {
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
            
            this.renderProjectsList();
            
        } catch (error) {
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
        const projectsList = document.querySelector(UI.selectors.projectsList);
        if (!projectsList) {
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
    },
    
    /**
     * Select and load a project + SCROLL POSITION AWARENESS
     */
    selectProject: async function(projectId) {
        try {
            UI.showLoading();
            this.state.currentProject = projectId;
            
            // Reset current file state in App
            if (typeof App !== 'undefined' && App.setState) {
                App.setState({ currentFile: null });
            }
            
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
            
            // Update URL and page title (NavigationManager hoitaa scroll position)
            if (typeof NavigationManager !== 'undefined') {
                NavigationManager.updateUrl(projectId);
            }
            const projectName = project ? (project.name[UI.getCurrentLanguage()] || project.name.fi) : projectId;
            UI.updatePageTitle(projectName);
            
            UI.hideLoading();
            
            // UUSI: Anna NavigationManager:ille mahdollisuus palauttaa scroll position
            // Tämä tapahtuu NavigationManager.navigateToProject() funktion kautta
            
        } catch (error) {
            UI.showError(`Failed to load project: ${projectId}`, true);
            UI.hideLoading();
        }
    },
    
    /**
     * Load project file structure
     */
    loadProjectStructure: async function(projectId) {
        const currentLang = UI.getCurrentLanguage();
        const projectPath = `${this.config.projectsBasePath}${projectId}/${currentLang}/`;
        
        try {
            // Try to load project-specific manifest
            const projectManifestUrl = `${projectPath}manifest.json`;
            
            const response = await fetch(projectManifestUrl);
            
            if (response.ok) {
                const projectManifest = await response.json();
                this.renderProjectContent(projectManifest, projectPath);
            } else {
                this.renderBasicProjectStructure(projectId, projectPath);
            }
            
        } catch (error) {
            this.renderBasicProjectStructure(projectId, projectPath);
        }
    },
    
    /**
     * Render project content from manifest
     */
    renderProjectContent: function(manifest, basePath) {
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
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
                const categoryElement = document.querySelector(`[data-category="${categoryKey}"]`);
                if (categoryElement) {
                    categoryElement.innerHTML = '<div class="error-loading">Failed to load files</div>';
                }
            }
        }
    },
    
    /**
     * Render files for a category + SCROLL POSITION TALLENNUKSELLA
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
                            <button class="view-btn" onclick="ProjectManager.viewFileWithScrollSave('${filePath}')">
                                ${currentLang === 'fi' ? '👁️ Katso' : '👁️ View'}
                            </button>
                        ` : ''}
                        ${FileManager.isDownloadable(fileName) ? `
                            <button class="download-btn" onclick="ContentRenderer.downloadFile('${filePath}')">
                                ${currentLang === 'fi' ? '📥 Lataa' : '📥 Download'}
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        categoryElement.innerHTML = html;
    },
    
    /**
     * UUSI: View file with scroll position saving
     * Tämä funktio kutsutaan kun klikataan "👁️ Katso" nappia
     */
    viewFileWithScrollSave: function(filePath) {
        // Käytä NavigationManager:in navigateToFile funktiota
        // joka automaattisesti tallentaa scroll position
        if (typeof NavigationManager !== 'undefined') {
            NavigationManager.navigateToFile(filePath);
        } else {
            // Fallback jos NavigationManager ei ole saatavilla
            if (typeof ContentRenderer !== 'undefined') {
                ContentRenderer.viewFile(filePath);
            }
        }
    },
    
    /**
     * Render basic project structure (fallback)
     */
    renderBasicProjectStructure: function(projectId, basePath) {
        const contentArea = document.querySelector(UI.selectors.mainContent);
        if (!contentArea) {
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
     * Get current project
     */
    getCurrentProject: function() {
        return this.state.currentProject;
    },
    
    /**
     * Get project by ID
     */
    getProject: function(projectId) {
        return this.state.projects.find(p => p.id === projectId);
    },
    
    /**
     * Get all projects
     */
    getProjects: function() {
        return this.state.projects;
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
     * Cache project data
     */
    cacheProject: function(projectId, data) {
        this.state.projectCache.set(projectId, {
            data: data,
            timestamp: Date.now()
        });
    },
    
    /**
     * Get cached project data
     */
    getCachedProject: function(projectId) {
        const cached = this.state.projectCache.get(projectId);
        if (cached && Date.now() - cached.timestamp < 60 * 60 * 1000) { // 1 hour
            return cached.data;
        }
        return null;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua theme-debugin tapaan
    // console.log ei toimi tableteilla
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProjectManager;
}
