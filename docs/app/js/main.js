import { Router } from './router/Router.js';
import { ContentLoader } from './components/ContentLoader.js';
import { ThemeManager } from './components/ThemeManager.js';
import { LanguageManager } from './components/LanguageManager.js';
import { AutoTableOfContents } from './components/AutoTableOfContents.js';
// ContentCategorizer POISTETTU!

class EmergentPhysicsApp {
    constructor() {
        this.router = new Router();
        this.contentLoader = new ContentLoader();
        this.themeManager = new ThemeManager();
        this.languageManager = new LanguageManager();
        this.autoTOC = new AutoTableOfContents();
        
        this.currentLanguage = 'fi';
        this.isLoading = false;
    }
    
    // ... muu koodi sama kuin ennen
    
    async loadProjectOverview() {
        await this.loadContent('projects/indivisible-stochastic/overview');
        
        // Lisää automaattinen TOC oikealla kielellä
        this.autoTOC.currentPath = `${this.currentLanguage}/projects/indivisible-stochastic`;
        await this.autoTOC.injectTOC('.content-container', this.currentLanguage);
    }
    
    // ... muu koodi sama
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new EmergentPhysicsApp();
    app.init();
});

window.EmergentPhysicsApp = EmergentPhysicsApp;
