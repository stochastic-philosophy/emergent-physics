// app/js/components/ThemeManager.js
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
        
        // Update HTML attribute
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save to localStorage
        localStorage.setItem('theme', theme);
        
        // Update theme toggle icon
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const icon = toggle.querySelector('.theme-icon');
            icon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        
        // Update Prism theme
        this.updateCodeTheme(theme);
        
        console.log(`🎨 Theme changed to: ${theme}`);
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { theme } 
        }));
    }
    
    updateCodeTheme(theme) {
        const themeMap = {
            'light': 'prism-default',
            'dark': 'prism-tomorrow-night'
        };
        
        // Remove old theme link
        const oldLink = document.querySelector('link[data-prism-theme]');
        if (oldLink) {
            oldLink.remove();
        }
        
        // Add new theme
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/${themeMap[theme]}.min.css`;
        newLink.setAttribute('data-prism-theme', theme);
        document.head.appendChild(newLink);
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
}
