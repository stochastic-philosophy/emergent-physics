export class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'light';
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.setupThemeToggle();
        
        console.log(`🎨 Theme initialized: ${this.currentTheme}`);
    }
    
    setupThemeToggle() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => this.toggleTheme());
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }
    
    applyTheme(theme) {
        this.currentTheme = theme;
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const icon = toggle.querySelector('.theme-icon');
            icon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        
        this.updateCodeTheme(theme);
        
        console.log(`🎨 Theme changed to: ${theme}`);
        
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));
    }
    
    updateCodeTheme(theme) {
        const themeMap = {
            'light': 'prism',
            'dark': 'prism-tomorrow'
        };
        
        const oldLink = document.querySelector('#prism-theme');
        if (oldLink) {
            oldLink.href = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/${themeMap[theme]}.min.css`;
        }
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
}
