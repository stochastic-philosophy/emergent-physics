/**
 * Theme and Language Manager (Simplified Fix)
 * Simple approach that should work reliably
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
        DEBUG.info('Initializing ThemeManager (Simplified)...');
        
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
            
            // Apply initial theme and language
            this.applyTheme(this.current.theme);
            this.applyLanguage(this.current.language);
            
            // Set up event listeners
            this.setupEventListeners();
            
            DEBUG.success('ThemeManager initialized successfully');
            
        } catch (error) {
            DEBUG.reportError(error, 'ThemeManager initialization failed');
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
        DEBUG.info('=== THEME TOGGLE CLICKED ===');
        const newTheme = this.current.theme === 'light' ? 'dark' : 'light';
        DEBUG.info(`Toggling from ${this.current.theme} to ${newTheme}`);
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
        
        DEBUG.info(`Setting theme to: ${theme}`);
        this.current.theme = theme;
        
        // Use Storage module if available, fallback to localStorage
        if (typeof Storage !== 'undefined') {
            Storage.setTheme(theme);
            DEBUG.info('Theme saved via Storage module');
        } else {
            localStorage.setItem('theme', theme);
            DEBUG.info('Theme saved via localStorage');
        }
        
        this.applyTheme(theme);
        DEBUG.info(`Theme changed to: ${theme}`);
    },
    
    /**
     * Apply theme to the document (SIMPLIFIED VERSION)
     */
    applyTheme: function(theme) {
        try {
            DEBUG.info(`Applying theme: ${theme}`);
            
            // STEP 1: Update CSS file (simple method)
            let themeCSS = document.getElementById('theme-css');
            if (!themeCSS) {
                // Create the CSS link if it doesn't exist
                themeCSS = document.createElement('link');
                themeCSS.id = 'theme-css';
                themeCSS.rel = 'stylesheet';
                document.head.appendChild(themeCSS);
                DEBUG.info('Created theme CSS link element');
            }
            
            // Force reload CSS by adding timestamp
            const timestamp = Date.now();
            themeCSS.href = `assets/css/themes-${theme}.css?v=${timestamp}`;
            DEBUG.info(`Updated CSS href: themes-${theme}.css?v=${timestamp}`);
            
            // STEP 2: Update body class immediately
            const oldClasses = document.body.className;
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
            DEBUG.info(`Body class changed from "${oldClasses}" to "${document.body.className}"`);
            
            // STEP 3: Also update html element
            document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
            document.documentElement.classList.add(`theme-${theme}`);
            DEBUG.info(`HTML class updated to include theme-${theme}`);
            
            // STEP 4: Update theme toggle icon
            this.updateThemeIcon(theme);
            
            // STEP 5: Update status display
            this.updateStatusDisplay();
            
            // STEP 6: Debug current styles
            setTimeout(() => {
                const bodyStyle = getComputedStyle(document.body);
                DEBUG.info(`Applied styles - Background: ${bodyStyle.backgroundColor}, Color: ${bodyStyle.color}`);
            }, 100);
            
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
            DEBUG.info(`Updated theme icon to: ${iconName}`);
            
            // Refresh feather icons if available
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        } else {
            DEBUG.warn('Theme icon element not found');
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
     * Debug function to check current state
     */
    debug: function() {
        console.group('🎨 ThemeManager Debug');
        console.log('Current theme:', this.current.theme);
        console.log('Current language:', this.current.language);
        console.log('Body classes:', document.body.className);
        console.log('LocalStorage theme:', localStorage.getItem('theme'));
        console.log('LocalStorage language:', localStorage.getItem('language'));
        
        const themeCSS = document.getElementById('theme-css');
        console.log('Theme CSS href:', themeCSS ? themeCSS.href : 'Not found');
        
        const bodyStyle = getComputedStyle(document.body);
        console.log('Body background:', bodyStyle.backgroundColor);
        console.log('Body color:', bodyStyle.color);
        console.groupEnd();
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
