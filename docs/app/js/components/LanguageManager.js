export class LanguageManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('language') || 'fi';
        this.onLanguageChange = null;
    }
    
    init(onLanguageChangeCallback) {
        this.onLanguageChange = onLanguageChangeCallback;
        this.setupLanguageSwitcher();
        
        console.log(`🌐 Language initialized: ${this.currentLanguage}`);
    }
    
    setupLanguageSwitcher() {
        const buttons = document.querySelectorAll('.lang-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                this.switchLanguage(lang);
            });
            
            if (btn.dataset.lang === this.currentLanguage) {
                btn.classList.add('active');
            }
        });
    }
    
    switchLanguage(lang) {
        if (lang === this.currentLanguage) return;
        
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        // Update button states
        const buttons = document.querySelectorAll('.lang-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        if (this.onLanguageChange) {
            this.onLanguageChange(lang);
        }
        
        console.log(`🌐 Language switched to: ${lang}`);
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
}
