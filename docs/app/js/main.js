// app/js/main.js
import { Router } from './router/Router.js';
import { Navigation } from './components/Navigation.js';
import { ContentLoader } from './components/ContentLoader.js';
import { ThemeManager } from './components/ThemeManager.js';
import { LanguageManager } from './components/LanguageManager.js';
import { SimulationEngine } from './components/SimulationEngine.js';

class EmergentPhysicsApp {
    constructor() {
        this.router = new Router();
        this.navigation = new Navigation();
        this.contentLoader = new ContentLoader();
        this.themeManager = new ThemeManager();
        this.languageManager = new LanguageManager();
        this.simulationEngine = new SimulationEngine();
        
        this.currentLanguage = 'fi';
        this.isLoading = false;
    }
    
    async init() {
        console.log('🚀 Initializing Emergent Physics SPA...');
        
        // Initialize components
        this.themeManager.init();
        this.languageManager.init(this.handleLanguageChange.bind(this));
        this.navigation.init(this.handleNavigation.bind(this));
        
        // Setup routing
        this.setupRouting();
        
        // Load initial content
        await this.loadInitialContent();
        
        // Hide loading spinner
        this.hideLoadingSpinner();
        
        console.log('✅ SPA Initialized successfully');
    }
    
    setupRouting() {
        // Define routes
        const routes = {
            '': () => this.loadContent('home'),
            'home': () => this.loadContent('home'),
            'projects/indivisible-stochastic': () => this.loadContent('projects/indivisible-stochastic/overview'),
            'projects/indivisible-stochastic/phase1': () => this.loadContent('projects/indivisible-stochastic/phase1'),
            'projects/indivisible-stochastic/phase2': () => this.loadContent('projects/indivisible-stochastic/phase2'),
            'projects/indivisible-stochastic/phase3': () => this.loadContent('projects/indivisible-stochastic/phase3'),
            'simulations/hybrid-models': () => this.loadSimulation('hybrid-models'),
            'about': () => this.loadContent('about')
        };
        
        this.router.init(routes);
    }
    
    async loadContent(contentPath) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            const content = await this.contentLoader.loadMarkdown(
                `app/content/${this.currentLanguage}/${contentPath}.md`
            );
            
            this.renderContent(content);
            this.updateBreadcrumb(contentPath);
            this.generateTableOfContents();
            
        } catch (error) {
            console.error('Content loading failed:', error);
            this.renderErrorState(contentPath);
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }
    
    async loadSimulation(simulationType) {
        console.log(`🔬 Loading simulation: ${simulationType}`);
        
        // Load markdown description
        await this.loadContent(`simulations/${simulationType}`);
        
        // Initialize interactive simulation
        this.simulationEngine.loadSimulation(simulationType);
    }
    
    renderContent(content) {
        const container = document.getElementById('content-container');
        
        // Smooth transition
        container.style.opacity = '0';
        
        setTimeout(() => {
            container.innerHTML = content.html;
            
            // Re-render math expressions
            if (window.MathJax) {
                MathJax.typesetPromise([container]);
            }
            
            // Re-highlight code blocks
            if (window.Prism) {
                Prism.highlightAllUnder(container);
            }
            
            // Add click handlers for internal links
            this.setupInternalLinks(container);
            
            container.style.opacity = '1';
        }, 150);
    }
    
    setupInternalLinks(container) {
        const links = container.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('href').substring(1);
                this.router.navigate(route);
            });
        });
    }
    
    handleLanguageChange(newLanguage) {
        if (newLanguage === this.currentLanguage) return;
        
        this.currentLanguage = newLanguage;
        document.documentElement.lang = newLanguage;
        
        // Reload current content in new language
        const currentRoute = this.router.getCurrentRoute();
        this.loadContent(currentRoute || 'home');
        
        console.log(`🌐 Language changed to: ${newLanguage}`);
    }
    
    generateTableOfContents() {
        const headers = document.querySelectorAll('#content-container h2, #content-container h3');
        const tocList = document.getElementById('toc-list');
        const tocSidebar = document.getElementById('table-of-contents');
        
        if (headers.length > 3) {
            // Generate TOC
            tocList.innerHTML = '';
            headers.forEach((header, index) => {
                const anchor = `toc-${index}`;
                header.id = anchor;
                
                const li = document.createElement('li');
                li.className = header.tagName.toLowerCase();
                li.innerHTML = `<a href="#${anchor}">${header.textContent}</a>`;
                tocList.appendChild(li);
            });
            
            tocSidebar.setAttribute('aria-hidden', 'false');
        } else {
            tocSidebar.setAttribute('aria-hidden', 'true');
        }
    }
    
    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        const parts = path.split('/');
        
        let breadcrumbHTML = '<a href="#home">🏠 Etusivu</a>';
        let currentPath = '';
        
        parts.forEach((part, index) => {
            if (part && index < parts.length - 1) {
                currentPath += (currentPath ? '/' : '') + part;
                const displayName = this.getBreadcrumbDisplayName(part);
                breadcrumbHTML += ` → <a href="#${currentPath}">${displayName}</a>`;
            }
        });
        
        breadcrumb.innerHTML = breadcrumbHTML;
        breadcrumb.setAttribute('aria-hidden', 'false');
    }
    
    getBreadcrumbDisplayName(part) {
        const names = {
            'projects': 'Projektit',
            'indivisible-stochastic': 'Indivisible Stochastic',
            'simulations': 'Simulaatiot',
            'phase1': 'Vaihe 1',
            'phase2': 'Vaihe 2', 
            'phase3': 'Vaihe 3'
        };
        return names[part] || part;
    }
    
    showLoadingState() {
        const container = document.getElementById('content-container');
        container.classList.add('loading');
    }
    
    hideLoadingState() {
        const container = document.getElementById('content-container');
        container.classList.remove('loading');
    }
    
    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.opacity = '0';
        setTimeout(() => spinner.style.display = 'none', 300);
    }
    
    renderErrorState(contentPath) {
        const container = document.getElementById('content-container');
        container.innerHTML = `
            <div class="error-state">
                <h2>⚠️ Sisältöä ei löytynyt</h2>
                <p>Polku <code>${contentPath}</code> ei ole saatavilla.</p>
                <a href="#home" class="btn-primary">Palaa etusivulle</a>
            </div>
        `;
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new EmergentPhysicsApp();
    app.init();
});

// Export for debugging
window.EmergentPhysicsApp = EmergentPhysicsApp;
