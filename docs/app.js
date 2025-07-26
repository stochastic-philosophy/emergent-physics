// ================================================
// EMERGENT PHYSICS RESEARCH - MAIN APPLICATION
// Tablet-friendly development with debug support
// ================================================

class EmergentPhysicsApp {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'fi';
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.currentProject = 'indivisible-stochastic';
        this.manifest = null;
        this.translations = {};
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Emergent Physics App...');
            
            // Load manifest
            await this.loadManifest();
            
            // Set initial theme and language
            this.applyTheme(this.currentTheme);
            this.applyLanguage(this.currentLang);
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load file list
            await this.loadFileList();
            
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Sovelluksen alustus epäonnistui: ' + error.message);
        }
    }
    
    async loadManifest() {
        try {
            console.log('📄 Loading manifest...');
            const response = await fetch('manifest.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.manifest = await response.json();
            this.translations = this.manifest.translations || {};
            
            console.log('✅ Manifest loaded:', this.manifest.site.title);
            
        } catch (error) {
            console.error('❌ Failed to load manifest:', error);
            throw error;
        }
    }
    
    setupEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
                this.applyTheme(newTheme);
            });
        }
        
        // Language toggle
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                const newLang = this.currentLang === 'fi' ? 'en' : 'fi';
                this.applyLanguage(newLang);
            });
        }
        
        // Project selector
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                this.currentProject = e.target.value;
                this.loadFileList();
            });
        }
        
        console.log('✅ Event listeners set up');
    }
    
    applyTheme(theme) {
        console.log('🎨 Applying theme:', theme);
        
        this.currentTheme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'light' ? '🌓' : '☀️';
        }
        
        // Force Prism.js re-highlight if content is loaded
        if (window.Prism && document.querySelector('.content pre code')) {
            setTimeout(() => {
                window.Prism.highlightAll();
            }, 100);
        }
    }
    
    applyLanguage(lang) {
        console.log('🌐 Applying language:', lang);
        
        this.currentLang = lang;
        document.body.setAttribute('data-lang', lang);
        document.documentElement.setAttribute('lang', lang);
        localStorage.setItem('lang', lang);
        
        // Update language toggle button
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.textContent = lang === 'fi' ? '🌐 EN' : '🌐 FI';
        }
        
        // Update translations
        this.updateTranslations();
        
        // Reload file list for new language
        this.loadFileList();
    }
    
    updateTranslations() {
        const translations = this.translations[this.currentLang] || {};
        const elements = document.querySelectorAll('[data-translate]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getNestedTranslation(translations, key);
            
            if (translation) {
                element.textContent = translation;
            }
        });
    }
    
    getNestedTranslation(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] ? current[key] : null;
        }, obj);
    }
    
    async loadFileList() {
        console.log('📂 Loading file list for project:', this.currentProject);
        
        const fileListElement = document.getElementById('file-list');
        if (!fileListElement) return;
        
        try {
            fileListElement.innerHTML = '<div class="loading">Ladataan...</div>';
            
            if (!this.manifest || !this.manifest.projects[this.currentProject]) {
                throw new Error('Project not found in manifest');
            }
            
            const project = this.manifest.projects[this.currentProject];
            const files = project.files[this.currentLang] || project.files['fi'] || [];
            const categories = project.categories || {};
            
            if (files.length === 0) {
                fileListElement.innerHTML = '<div class="loading">Ei tiedostoja saatavilla</div>';
                return;
            }
            
            // Group files by category
            const groupedFiles = this.groupFilesByCategory(files, categories);
            
            // Create file list HTML
            let html = '';
            Object.entries(groupedFiles).forEach(([category, categoryFiles]) => {
                const categoryName = categories[category] && categories[category][this.currentLang] 
                    ? categories[category][this.currentLang] 
                    : category;
                
                categoryFiles.forEach(file => {
                    const fileName = file.replace('.md', '').replace(/_/g, ' ');
                    html += `
                        <a href="#" class="file-item" data-file="${file}" data-category="${category}">
                            <div class="category">${categoryName}</div>
                            <div class="title">${fileName}</div>
                        </a>
                    `;
                });
            });
            
            fileListElement.innerHTML = html;
            
            // Add click listeners to file items
            fileListElement.querySelectorAll('.file-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const fileName = item.getAttribute('data-file');
                    this.loadFile(fileName);
                    
                    // Update active state
                    fileListElement.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                });
            });
            
            console.log('✅ File list loaded:', files.length, 'files');
            
        } catch (error) {
            console.error('❌ Failed to load file list:', error);
            fileListElement.innerHTML = '<div class="error">Virhe ladattaessa tiedostoluetteloa</div>';
        }
    }
    
    groupFilesByCategory(files, categories) {
        const grouped = {};
        
        files.forEach(file => {
            // Try to determine category from filename
            let category = 'other';
            
            // Look for category prefixes or keywords
            const filename = file.toLowerCase();
            
            if (filename.includes('overview') || filename.includes('yleiskatsaus')) {
                category = 'overview';
            } else if (filename.includes('documentation') || filename.includes('dokumentaatio')) {
                category = 'documentation';
            } else if (filename.includes('nextsteps') || filename.includes('seuraava')) {
                category = 'nextsteps';
            } else if (filename.includes('phase1') || filename.includes('vaihe1')) {
                category = 'phase1';
            } else if (filename.includes('phase2') || filename.includes('vaihe2')) {
                category = 'phase2';
            } else if (filename.includes('phase3') || filename.includes('vaihe3')) {
                category = 'phase3';
            }
            
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(file);
        });
        
        return grouped;
    }
    
    async loadFile(fileName) {
        console.log('📄 Loading file:', fileName);
        
        const contentElement = document.getElementById('content');
        if (!contentElement) return;
        
        try {
            contentElement.innerHTML = '<div class="loading">Ladataan sisältöä...</div>';
            
            const filePath = `projects/${this.currentProject}/${this.currentLang}/${fileName}`;
            console.log('📁 File path:', filePath);
            
            const response = await fetch(filePath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const content = await response.text();
            console.log('✅ File content loaded, length:', content.length);
            
            // Parse markdown
            const htmlContent = this.parseMarkdown(content);
            contentElement.innerHTML = htmlContent;
            
            // Re-render MathJax
            if (window.MathJax) {
                console.log('🧮 Re-rendering MathJax...');
                MathJax.typesetPromise([contentElement]).catch((err) => {
                    console.error('❌ MathJax error:', err);
                });
            }
            
            // Re-highlight code
            if (window.Prism) {
                console.log('🎨 Re-highlighting code...');
                window.Prism.highlightAllUnder(contentElement);
            }
            
        } catch (error) {
            console.error('❌ Failed to load file:', error);
            contentElement.innerHTML = `
                <div class="error">
                    <h3>Virhe ladattaessa tiedostoa</h3>
                    <p>Tiedostoa <code>${fileName}</code> ei voitu ladata.</p>
                    <p>Virhe: ${error.message}</p>
                </div>
            `;
        }
    }
    
    parseMarkdown(content) {
        try {
            if (typeof marked !== 'undefined') {
                console.log('📝 Parsing markdown with marked.js...');
                
                // Configure marked for better output
                marked.setOptions({
                    breaks: true,
                    gfm: true,
                    headerIds: true,
                    mangle: false
                });
                
                return marked.parse(content);
            } else {
                console.warn('⚠️ Marked.js not available, returning raw content');
                return `<pre>${content}</pre>`;
            }
        } catch (error) {
            console.error('❌ Markdown parsing failed:', error);
            return `<pre>${content}</pre>`;
        }
    }
    
    showError(message) {
        const contentElement = document.getElementById('content');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error">
                    <h3>Virhe</h3>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌟 DOM loaded, starting app...');
    window.app = new EmergentPhysicsApp();
});

// Global error handler for better debugging
window.addEventListener('error', (e) => {
    console.error('🚨 Global error:', e.error);
});

// Expose app globally for debugging
window.debug = {
    app: () => window.app,
    manifest: () => window.app?.manifest,
    reloadFileList: () => window.app?.loadFileList(),
    switchTheme: (theme) => window.app?.applyTheme(theme),
    switchLanguage: (lang) => window.app?.applyLanguage(lang)
};
