/**
 * Theme and Language Manager (Visual Debug for Tablets)
 * Shows debug info directly on the page for tablet users
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
    
    // Debug state
    debug: {
        calls: [],
        visible: false,
        element: null
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
     * Create visual debug panel for tablets
     */
    createDebugPanel: function() {
        if (this.debug.element) return;
        
        const panel = document.createElement('div');
        panel.id = 'theme-debug-panel';
        panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: 10px;
            width: 350px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.9);
            color: #00ff00;
            font-family: monospace;
            font-size: 11px;
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 10px;
            z-index: 10000;
            overflow-y: auto;
            display: none;
        `;
        
        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #ffff00;">🎨 Theme Debug</strong>
                <button onclick="ThemeManager.hideDebug()" style="background: #ff0000; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
            <div>
                <button onclick="ThemeManager.testLight()" style="background: #fff; color: #000; border: none; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Light</button>
                <button onclick="ThemeManager.testDark()" style="background: #000; color: #fff; border: 1px solid #fff; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Dark</button>
                <button onclick="ThemeManager.refreshDebug()" style="background: #0088ff; color: #fff; border: none; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Refresh</button>
            </div>
            <div id="debug-content" style="margin-top: 10px; border-top: 1px solid #00ff00; padding-top: 10px;">
                Loading debug info...
            </div>
        `;
        
        document.body.appendChild(panel);
        this.debug.element = panel;
    },
    
    /**
     * Show debug panel
     */
    showDebug: function() {
        this.createDebugPanel();
        this.debug.element.style.display = 'block';
        this.debug.visible = true;
        this.refreshDebug();
    },
    
    /**
     * Hide debug panel
     */
    hideDebug: function() {
        if (this.debug.element) {
            this.debug.element.style.display = 'none';
            this.debug.visible = false;
        }
    },
    
    /**
     * Update debug panel content
     */
    refreshDebug: function() {
        if (!this.debug.element) return;
        
        const content = this.debug.element.querySelector('#debug-content');
        if (!content) return;
        
        const themeCSS = document.getElementById('theme-css');
        const bodyStyle = getComputedStyle(document.body);
        
        content.innerHTML = `
            <div><strong>Current State:</strong></div>
            <div>Theme: <span style="color: #ffff00;">${this.current.theme}</span></div>
            <div>Language: <span style="color: #ffff00;">${this.current.language}</span></div>
            <div>Body Class: <span style="color: #ffff00;">${document.body.className}</span></div>
            <div>LocalStorage: <span style="color: #ffff00;">${localStorage.getItem('theme') || 'null'}</span></div>
            <div>CSS Href: <span style="color: #ffff00;">${themeCSS ? themeCSS.href.split('/').pop() : 'none'}</span></div>
            <div>BG Color: <span style="color: #ffff00;">${bodyStyle.backgroundColor}</span></div>
            <div>Text Color: <span style="color: #ffff00;">${bodyStyle.color}</span></div>
            <div><strong>Recent Logs:</strong></div>
            <div style="max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.5); padding: 5px; margin-top: 5px;">
                ${this.debug.calls.slice(-10).map(call => 
                    `<div style="margin: 2px 0; color: #00ff88;">[${call.timestamp.split('T')[1].split('.')[0]}] ${call.message}</div>`
                ).join('')}
            </div>
        `;
    },
    
    /**
     * Test light theme
     */
    testLight: function() {
        this.log('🧪 TEST LIGHT THEME button clicked');
        this.setTheme('light', 'test-button');
        setTimeout(() => this.refreshDebug(), 200);
    },
    
    /**
     * Test dark theme  
     */
    testDark: function() {
        this.log('🧪 TEST DARK THEME button clicked');
        this.setTheme('dark', 'test-button');
        setTimeout(() => this.refreshDebug(), 200);
    },
    
    /**
     * Debug logger with visual output
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, data };
        this.debug.calls.push(logEntry);
        
        console.log(`[ThemeManager] ${message}`, data || '');
        
        // Keep only last 20 entries
        if (this.debug.calls.length > 20) {
            this.debug.calls = this.debug.calls.slice(-20);
        }
        
        // Update debug panel if visible
        if (this.debug.visible) {
            setTimeout(() => this.refreshDebug(), 10);
        }
    },
    
    /**
     * Initialize theme and language management
     */
    init: function() {
        this.log('🚀 INITIALIZING ThemeManager...');
        
        try {
            // Wait for Storage module if not ready
            if (typeof Storage === 'undefined') {
                this.log('⏳ Storage module not ready, retrying...');
                setTimeout(() => this.init(), 50);
                return;
            }
            
            // Load saved preferences
            this.current.theme = Storage.getTheme();
            this.current.language = Storage.getLanguage();
            
            this.log(`📖 Loaded: theme=${this.current.theme}, lang=${this.current.language}`);
            
            // Apply initial theme and language
            this.applyTheme(this.current.theme);
            this.applyLanguage(this.current.language);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Auto-show debug panel on tablets
            setTimeout(() => {
                this.showDebug();
            }, 1000);
            
            this.log('✅ ThemeManager initialized');
            
        } catch (error) {
            this.log('❌ ThemeManager init failed: ' + error.message);
        }
    },
    
    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            this.log('🎛️ Adding theme toggle listener');
            themeToggle.addEventListener('click', (e) => {
                this.log('🖱️ THEME TOGGLE CLICKED!');
                this.toggleTheme();
            });
        } else {
            this.log('⚠️ Theme toggle button not found!');
        }
        
        // Language buttons
        const langButtons = document.querySelectorAll('.lang-btn');
        this.log(`🌐 Found ${langButtons.length} language buttons`);
        langButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                const lang = e.target.getAttribute('data-lang');
                this.log(`🗣️ Language button clicked: ${lang}`);
                if (lang) {
                    this.setLanguage(lang);
                }
            });
        });
    },
    
    /**
     * Toggle between themes
     */
    toggleTheme: function() {
        this.log('🔄 TOGGLE THEME STARTED');
        
        const oldTheme = this.current.theme;
        const newTheme = oldTheme === 'light' ? 'dark' : 'light';
        
        this.log(`🎯 Toggling: ${oldTheme} → ${newTheme}`);
        this.setTheme(newTheme);
        
        // Check result after delay
        setTimeout(() => {
            const result = this.current.theme;
            const bodyClass = document.body.className;
            
            this.log(`🔍 Toggle result: expected=${newTheme}, actual=${result}, body=${bodyClass}`);
            
            if (result !== newTheme) {
                this.log('🚨 TOGGLE FAILED! Something overrode the theme');
            }
            
            this.refreshDebug();
        }, 300);
    },
    
    /**
     * Set specific theme
     */
    setTheme: function(theme, source = 'unknown') {
        this.log(`🎨 SET THEME: ${theme} (from: ${source})`);
        
        if (theme !== 'light' && theme !== 'dark') {
            this.log(`⚠️ Invalid theme: ${theme}, using light`);
            theme = 'light';
        }
        
        const oldTheme = this.current.theme;
        this.current.theme = theme;
        
        // Save to storage
        if (typeof Storage !== 'undefined') {
            Storage.setTheme(theme);
            this.log('💾 Saved via Storage module');
        } else {
            localStorage.setItem('theme', theme);
            this.log('💾 Saved via localStorage');
        }
        
        this.applyTheme(theme);
        this.log(`✅ Theme set: ${oldTheme} → ${theme}`);
    },
    
    /**
     * Apply theme to document
     */
    applyTheme: function(theme) {
        this.log(`🖌️ APPLYING THEME: ${theme}`);
        
        try {
            // Update CSS
            let themeCSS = document.getElementById('theme-css');
            if (!themeCSS) {
                themeCSS = document.createElement('link');
                themeCSS.id = 'theme-css';
                themeCSS.rel = 'stylesheet';
                document.head.appendChild(themeCSS);
                this.log('🆕 Created CSS link');
            }
            
            const newHref = `assets/css/themes-${theme}.css?v=${Date.now()}`;
            themeCSS.href = newHref;
            this.log(`🔗 CSS updated: themes-${theme}.css`);
            
            // Update body class
            const oldClass = document.body.className;
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
            
            this.log(`👤 Body class: ${oldClass} → ${document.body.className}`);
            
            // Update HTML element
            document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
            document.documentElement.classList.add(`theme-${theme}`);
            
            // Update icon
            this.updateThemeIcon(theme);
            this.updateStatusDisplay();
            
            // Verify after delay
            setTimeout(() => {
                const finalClass = document.body.className;
                const finalTheme = this.current.theme;
                
                this.log(`🔍 VERIFY: class=${finalClass}, theme=${finalTheme}`);
                
                if (!finalClass.includes(`theme-${theme}`)) {
                    this.log('🚨 BODY CLASS LOST!');
                }
                
                if (finalTheme !== theme) {
                    this.log('🚨 THEME CHANGED BY OTHER CODE!');
                }
            }, 100);
            
        } catch (error) {
            this.log('❌ Apply theme error: ' + error.message);
        }
    },
    
    /**
     * Update theme icon
     */
    updateThemeIcon: function(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            const iconName = theme === 'light' ? 'moon' : 'sun';
            themeIcon.setAttribute('data-feather', iconName);
            this.log(`🌙 Icon updated: ${iconName}`);
            
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }
    },
    
    /**
     * Set language
     */
    setLanguage: function(language) {
        this.log(`🗣️ Setting language: ${language}`);
        
        if (!this.texts[language]) {
            language = this.defaults.language;
        }
        
        this.current.language = language;
        
        if (typeof Storage !== 'undefined') {
            Storage.setLanguage(language);
        } else {
            localStorage.setItem('language', language);
        }
        
        this.applyLanguage(language);
    },
    
    /**
     * Apply language
     */
    applyLanguage: function(language) {
        try {
            document.documentElement.lang = language;
            
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
            
            this.updateLanguageButtons(language);
            this.updateStatusDisplay();
            
        } catch (error) {
            this.log('❌ Apply language error: ' + error.message);
        }
    },
    
    /**
     * Update language buttons
     */
    updateLanguageButtons: function(language) {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            const buttonLang = button.getAttribute('data-lang');
            button.classList.toggle('active', buttonLang === language);
        });
    },
    
    /**
     * Update status display
     */
    updateStatusDisplay: function() {
        const themeDisplay = document.getElementById('current-theme-display');
        if (themeDisplay) {
            const themeText = this.getText(`theme_${this.current.theme}`);
            themeDisplay.textContent = themeText || this.current.theme;
        }
        
        const languageDisplay = document.getElementById('current-language-display');
        if (languageDisplay) {
            const langText = this.getText(`language_${this.current.language === 'fi' ? 'finnish' : 'english'}`);
            languageDisplay.textContent = langText || this.current.language;
        }
    },
    
    /**
     * Get text for key
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
    }
};

/**
 * Initialize on DOM load
 */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        ThemeManager.init();
    }, 100);
});

/**
 * Expose globally
 */
window.ThemeManager = ThemeManager;
