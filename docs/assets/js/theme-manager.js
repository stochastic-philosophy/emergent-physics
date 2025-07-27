/**
 * Theme and Language Manager (Fixed CSS loading)
 * Handles theme switching (light/dark) and language switching (fi/en)
 * Uses localStorage to persist user preferences
 */

window.ThemeManager = {
    // Default settings
    defaults: {
        theme: 'light',
        language: 'fi'
    },
    
    // Current settings
    current: {
        theme: null,
        language: null
    },
    
    // CSS preloading state
    cssLoaded: {
        light: false,
        dark: false
    },
    
    // Language text mappings
    texts: {
        fi: {
            site_title: 'Emergent Physics Research',
            nav_projects: 'Projektit',
            loading: 'Ladataan...',
            loading_content: 'Ladataan sisältöä...',
            welcome_title: 'Tervetuloa tutkimusalustalle',
            welcome_description: 'Valitse vasemmalta projekti aloittaaksesi tutustumisen tutkimustuloksiin.',
            status_theme: 'Teema',
            status_language: 'Kieli',
            footer_text: '&copy; 2025 Emergent Physics Research.',
            debug_link: 'Debug Tools',
            theme_light: 'Vaalea',
            theme_dark: 'Tumma',
            language_finnish: 'Suomi',
            language_english: 'English'
        },
        en: {
            site_title: 'Emergent Physics Research',
            nav_projects: 'Projects',
            loading: 'Loading...',
            loading_content: 'Loading content...',
            welcome_title: 'Welcome to Research Platform',
            welcome_description: 'Select a project from the left to start exploring research results.',
            status_theme: 'Theme',
            status_language: 'Language',
            footer_text: '&copy; 2025 Emergent Physics Research.',
            debug_link: 'Debug Tools',
            theme_light: 'Light',
            theme_dark: 'Dark',
            language_finnish: 'Suomi',
            language_english: 'English'
        }
    },
    
    /**
     * Initialize theme and language management
     */
    init: function() {
        DEBUG.info('Initializing ThemeManager...');
        
        try {
            // Wait for Storage module if not ready
            if (typeof Storage === 'undefined') {
                DEBUG.warn('Storage module not ready, retrying in 50ms...');
                setTimeout(() => this.init(), 50);
                return;
            }
            
            // Load saved preferences or use defaults
            this.current.theme = Storage.getTheme();
            this.current.language = Storage.getLanguage();
            
            DEBUG.info(`Loaded preferences: theme=${this.current.theme}, language=${this.current.language}`);
            
            // Preload CSS files to prevent flashing
            this.preloadCSSFiles().then(() => {
                // Apply initial theme and language
                this.applyTheme(this.current.theme);
                this.applyLanguage(this.current.language);
                
                // Set up event listeners
                this.setupEventListeners();
                
                DEBUG.success('ThemeManager initialized successfully');
            });
            
        } catch (error) {
            DEBUG.reportError(error, 'ThemeManager initialization failed');
        }
    },
    
    /**
     * Preload both CSS theme files to prevent flashing
     */
    preloadCSSFiles: async function() {
        DEBUG.info('Preloading CSS theme files...');
        
        try {
            // Create light theme link if it doesn't exist
            let lightCSS = document.getElementById('theme-css-light');
            if (!lightCSS) {
                lightCSS = document.createElement('link');
                lightCSS.id = 'theme-css-light';
                lightCSS.rel = 'stylesheet';
                lightCSS.href = 'assets/css/themes-light.css';
                document.head.appendChild(lightCSS);
            }
            
            // Create dark theme link
            let darkCSS = document.getElementById('theme-css-dark');
            if (!darkCSS) {
                darkCSS = document.createElement('link');
                darkCSS.id = 'theme-css-dark';
                darkCSS.rel = 'stylesheet';
                darkCSS.href = 'assets/css/themes-dark.css';
                darkCSS.disabled = true; // Initially disabled
                document.head.appendChild(darkCSS);
            }
            
            // Wait for both CSS files to load
            const promises = [];
            
            if (!this.cssLoaded.light) {
                promises.push(new Promise((resolve) => {
                    if (lightCSS.sheet || lightCSS.styleSheet) {
                        this.cssLoaded.light = true;
                        resolve();
                    } else {
                        lightCSS.onload = () => {
                            this.cssLoaded.light = true;
                            resolve();
                        };
                    }
                }));
            }
            
            if (!this.cssLoaded.dark) {
                promises.push(new Promise((resolve) => {
                    if (darkCSS.sheet || darkCSS.styleSheet) {
                        this.cssLoaded.dark = true;
                        resolve();
                    } else {
                        darkCSS.onload = () => {
                            this.cssLoaded.dark = true;
                            resolve();
                        };
                    }
                }));
            }
            
            await Promise.all(promises);
            DEBUG.success('CSS theme files preloaded successfully');
            
        } catch (error) {
            DEBUG.warn('CSS preloading failed, using fallback method:', error);
        }
    },
    
    /**
     * Set up event listeners for theme and language switches
     */
    setupEventListeners: function() {
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Language buttons
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-lang');
                if (lang) {
                    this.setLanguage(lang);
                }
            });
        });
        
        DEBUG.info('Event listeners set up for theme and language controls');
    },
    
    /**
     * Toggle between light and dark themes
     */
    toggleTheme: function() {
        const newTheme = this.current.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    },
    
    /**
     * Set specific theme
     */
    setTheme: function(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            DEBUG.warn(`Invalid theme: ${theme}. Using default.`);
            theme = this.defaults.theme;
        }
        
        this.current.theme = theme;
        
        // Use Storage module if available, fallback to localStorage
        if (typeof Storage !== 'undefined') {
            Storage.setTheme(theme);
        } else {
            localStorage.setItem('theme', theme);
        }
        
        this.applyTheme(theme);
        DEBUG.info(`Theme changed to: ${theme}`);
    },
    
    /**
     * Apply theme to the document (Fixed version - no CSS loading flicker)
     */
    applyTheme: function(theme) {
        try {
            DEBUG.info(`Applying theme: ${theme}`);
            
            // Get both CSS links
            const lightCSS = document.getElementById('theme-css-light');
            const darkCSS = document.getElementById('theme-css-dark');
            
            if (lightCSS && darkCSS) {
                // Use the preloaded CSS files - just toggle disabled state
                if (theme === 'light') {
                    lightCSS.disabled = false;
                    darkCSS.disabled = true;
                } else {
                    lightCSS.disabled = true;
                    darkCSS.disabled = false;
                }
                DEBUG.info(`Switched to preloaded ${theme} theme CSS`);
            } else {
                // Fallback to old method if preloading failed
                DEBUG.warn('Preloaded CSS not found, using fallback method');
                const themeCSS = document.getElementById('theme-css');
                if (themeCSS) {
                    themeCSS.href = `assets/css/themes-${theme}.css`;
                }
            }
            
            // Update body class - CRITICAL for styling
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
            DEBUG.info(`Added body class: theme-${theme}`);
            
            // Also update html element for good measure
            document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
            document.documentElement.classList.add(`theme-${theme}`);
            
            // Update theme toggle icon
            this.updateThemeIcon(theme);
            
            // Update status display
            this.updateStatusDisplay();
            
            DEBUG.success(`Theme ${theme} applied successfully`);
            
        } catch (error) {
            DEBUG.reportError(error, 'Failed to apply theme');
        }
    },
    
    /**
     * Update theme toggle icon
     */
    updateThemeIcon: function(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            // Change icon based on theme
            const iconName = theme === 'light' ? 'moon' : 'sun';
            themeIcon.setAttribute('data-feather', iconName);
            
            // Refresh feather icons if available
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    },
    
    /**
     * Set specific language
     */
    setLanguage: function(language) {
        if (!this.texts[language]) {
            DEBUG.warn(`Invalid language: ${language}. Using default.`);
            language = this.defaults.language;
        }
        
        this.current.language = language;
        
        // Use Storage module if available, fallback to localStorage
        if (typeof Storage !== 'undefined') {
            Storage.setLanguage(language);
        } else {
            localStorage.setItem('language', language);
        }
        
        this.applyLanguage(language);
        DEBUG.info(`Language changed to: ${language}`);
    },
    
    /**
     * Apply language to the document
     */
    applyLanguage: function(language) {
        try {
            // Update document language attribute
            document.documentElement.lang = language;
            
            // Update all elements with data-key attributes
            const elements = document.querySelectorAll('[data-key]');
            elements.forEach(element => {
                const key = element.getAttribute('data-key');
                const text = this.getText(key, language);
                if (text) {
                    if (element.innerHTML.includes('&copy;')) {
                        element.innerHTML = text;
                    } else {
                        element.textContent = text;
                    }
                }
            });
            
            // Update language button states
            this.updateLanguageButtons(language);
            
            // Update status display
            this.updateStatusDisplay();
            
        } catch (error) {
            DEBUG.reportError(error, 'Failed to apply language');
        }
    },
    
    /**
     * Update language button states
     */
    updateLanguageButtons: function(language) {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            const buttonLang = button.getAttribute('data-lang');
            button.classList.toggle('active', buttonLang === language);
        });
    },
    
    /**
     * Update status display elements
     */
    updateStatusDisplay: function() {
        // Update theme display
        const themeDisplay = document.getElementById('current-theme-display');
        if (themeDisplay) {
            const themeText = this.getText(`theme_${this.current.theme}`);
            themeDisplay.textContent = themeText || this.current.theme;
        }
        
        // Update language display
        const languageDisplay = document.getElementById('current-language-display');
        if (languageDisplay) {
            const langText = this.getText(`language_${this.current.language === 'fi' ? 'finnish' : 'english'}`);
            languageDisplay.textContent = langText || this.current.language;
        }
    },
    
    /**
     * Get text in current or specified language
     */
    getText: function(key, language = null) {
        const lang = language || this.current.language || this.defaults.language;
        return this.texts[lang] && this.texts[lang][key];
    },
    
    /**
     * Get current theme
     */
    getTheme: function() {
        return this.current.theme;
    },
    
    /**
     * Get current language
     */
    getLanguage: function() {
        return this.current.language;
    },
    
    /**
     * Add custom text translations
     */
    addTexts: function(language, texts) {
        if (!this.texts[language]) {
            this.texts[language] = {};
        }
        Object.assign(this.texts[language], texts);
        
        DEBUG.info(`Added ${Object.keys(texts).length} texts for language: ${language}`);
    },
    
    /**
     * Get all available languages
     */
    getAvailableLanguages: function() {
        return Object.keys(this.texts);
    },
    
    /**
     * Get all available themes
     */
    getAvailableThemes: function() {
        return ['light', 'dark'];
    },
    
    /**
     * Reset to defaults
     */
    reset: function() {
        this.setTheme(this.defaults.theme);
        this.setLanguage(this.defaults.language);
        DEBUG.info('Settings reset to defaults');
    },
    
    /**
     * Export current settings
     */
    exportSettings: function() {
        return {
            theme: this.current.theme,
            language: this.current.language,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Import settings
     */
    importSettings: function(settings) {
        try {
            if (settings.theme) {
                this.setTheme(settings.theme);
            }
            if (settings.language) {
                this.setLanguage(settings.language);
            }
            DEBUG.success('Settings imported successfully');
        } catch (error) {
            DEBUG.reportError(error, 'Failed to import settings');
        }
    }
};

/**
 * Initialize on DOM load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all elements are ready
    setTimeout(() => {
        ThemeManager.init();
    }, 100);
});

/**
 * Expose ThemeManager globally for debugging
 */
window.ThemeManager = ThemeManager;
