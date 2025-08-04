/**
 * Theme and Language Manager (FIXED - No CSS flashing)
 * Preloads CSS before applying theme to prevent flashing
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
    
    // Control flags
    flags: {
        initialized: false,
        inToggle: false,
        eventListenersAdded: false
    },
    
    // CSS cache to prevent re-loading
    cssCache: {
        light: null,
        dark: null
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
     * Preload CSS for both themes to prevent flashing
     */
    preloadCSS: function() {
        const themes = ['light', 'dark'];
        
        themes.forEach(theme => {
            if (this.cssCache[theme]) return; // Already preloaded
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = `assets/css/themes-${theme}.css`;
            link.media = 'print'; // Load but don't apply
            link.onload = () => {
                link.media = 'all'; // Remove media restriction
                this.cssCache[theme] = link;
                this.log(`📦 CSS preloaded: themes-${theme}.css`);
            };
            
            // Add to head but hidden
            document.head.appendChild(link);
        });
    },
    
    /**
     * Create visual debug panel
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
                <button onclick="ThemeManager.forceLight()" style="background: #fff; color: #000; border: none; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Force Light</button>
                <button onclick="ThemeManager.forceDark()" style="background: #000; color: #fff; border: 1px solid #fff; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Force Dark</button>
                <button onclick="ThemeManager.testHeaderToggle()" style="background: #ff8800; color: #fff; border: none; padding: 5px 10px; margin: 2px; border-radius: 3px; cursor: pointer;">Test Header</button>
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
     * Test header toggle directly
     */
    testHeaderToggle: function() {
        this.log('🧪 TESTING HEADER TOGGLE DIRECTLY');
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            this.log('🖱️ Simulating click on header toggle...');
            themeToggle.click();
        } else {
            this.log('❌ Header toggle not found!');
        }
    },
    
    /**
     * Show debug panel
     */
    showDebug: function() {
        this.createDebugPanel();
        this.debug.element.style.display = 'block';
        if (window.DEBUG_MODE && localStorage.getItem('show_theme_debug') === 'true') {
            this.debug.visible = true;
        } else {
            this.debug.visible = false;
        }
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
     * Force light theme (bypasses toggle)
     */
    forceLight: function() {
        this.log('🧪 FORCE LIGHT THEME');
        this.setTheme('light', 'force-light');
    },
    
    /**
     * Force dark theme (bypasses toggle)
     */
    forceDark: function() {
        this.log('🧪 FORCE DARK THEME');
        this.setTheme('dark', 'force-dark');
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
            <div>In Toggle: <span style="color: #ffff00;">${this.flags.inToggle}</span></div>
            <div>Event Listeners: <span style="color: #ffff00;">${this.flags.eventListenersAdded}</span></div>
            <div>Preloaded CSS: <span style="color: #ffff00;">light=${!!this.cssCache.light}, dark=${!!this.cssCache.dark}</span></div>
            <div><strong>Recent Logs:</strong></div>
            <div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.5); padding: 5px; margin-top: 5px;">
                ${this.debug.calls.slice(-8).map(call => 
                    `<div style="margin: 2px 0; color: #00ff88;">[${call.timestamp.split('T')[1].split('.')[0]}] ${call.message}</div>`
                ).join('')}
            </div>
        `;
    },
    
    /**
     * Debug logger
     */
    log: function(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, data };
        this.debug.calls.push(logEntry);
        
        console.log(`[ThemeManager] ${message}`, data || '');
        
        // Keep only last 15 entries
        if (this.debug.calls.length > 15) {
            this.debug.calls = this.debug.calls.slice(-15);
        }
        
        // Update debug panel if visible
        if (this.debug.visible) {
            setTimeout(() => this.refreshDebug(), 10);
        }
    },
    
    /**
     * Initialize (with duplicate prevention)
     */
    init: function() {
        if (this.flags.initialized) {
            this.log('⚠️ ThemeManager already initialized, skipping');
            return;
        }
        
        this.log('🚀 INITIALIZING ThemeManager...');
        
        try {
            // Wait for Storage module if not ready
            if (typeof Storage === 'undefined') {
                this.log('⏳ Storage module not ready, retrying...');
                setTimeout(() => this.init(), 50);
                return;
            }
            
            // Preload both CSS files to prevent flashing
            this.preloadCSS();
            
            // Load saved preferences
            this.current.theme = Storage.getTheme();
            this.current.language = Storage.getLanguage();
            
            this.log(`📖 Loaded: theme=${this.current.theme}, lang=${this.current.language}`);
            
            // Apply initial theme and language
            this.applyTheme(this.current.theme);
            this.applyLanguage(this.current.language);
            
            // Set up event listeners (only once)
            this.setupEventListeners();
            
            // Mark as initialized
            this.flags.initialized = true;
            
            // Auto-show debug panel on tablets (optional)
            setTimeout(() => {
                this.showDebug();
            }, 1000);
            
            this.log('✅ ThemeManager initialized');
            
        } catch (error) {
            this.log('❌ ThemeManager init failed: ' + error.message);
        }
    },
    
    /**
     * Set up event listeners (SIMPLIFIED and BULLETPROOF)
     */
    setupEventListeners: function() {
        if (this.flags.eventListenersAdded) {
            this.log('⚠️ Event listeners already added, skipping');
            return;
        }
        
        // SIMPLIFIED theme toggle - no cloning, just direct event
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            this.log('🎛️ Adding theme toggle listener (SIMPLIFIED)');
            
            // Remove any existing onclick
            themeToggle.onclick = null;
            
            // Add single clean event listener
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                this.log('🖱️ HEADER THEME TOGGLE CLICKED!');
                this.instantToggle(); // Use instant toggle for header
            }, { once: false });
            
        } else {
            this.log('⚠️ Theme toggle button not found!');
        }
        
        // Language buttons (simplified)
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
        
        this.flags.eventListenersAdded = true;
        this.log('👂 Event listeners set up completed (SIMPLIFIED)');
    },
    
    /**
     * INSTANT TOGGLE - No delays, preloaded CSS
     */
    instantToggle: function() {
        if (this.flags.inToggle) {
            this.log('🚫 Already in toggle, aborting');
            return;
        }
        
        this.flags.inToggle = true;
        this.log('⚡ INSTANT TOGGLE STARTED');
        
        const oldTheme = this.current.theme;
        const newTheme = oldTheme === 'light' ? 'dark' : 'light';
        
        this.log(`🎯 Instant toggle: ${oldTheme} → ${newTheme}`);
        
        // Use instant theme setting (no async loading)
        this.setThemeInstant(newTheme, 'header-toggle');
        
        setTimeout(() => {
            this.flags.inToggle = false;
            this.log('⚡ Instant toggle completed');
            this.refreshDebug();
        }, 100);
    },
    
    /**
     * INSTANT theme setting - uses preloaded CSS
     */
    setThemeInstant: function(theme, source = 'unknown') {
        this.log(`⚡ SET THEME INSTANT: ${theme} (from: ${source})`);
        
        if (theme !== 'light' && theme !== 'dark') {
            this.log(`⚠️ Invalid theme: ${theme}, using light`);
            theme = 'light';
        }
        
        const oldTheme = this.current.theme;
        this.current.theme = theme;
        
        // Save to storage
        if (typeof Storage !== 'undefined') {
            Storage.setTheme(theme);
        } else {
            localStorage.setItem('theme', theme);
        }
        
        // Apply instantly using preloaded CSS
        this.applyThemeInstant(theme);
        this.log(`⚡ Theme set instantly: ${oldTheme} → ${theme}`);
    },
    
    /**
     * Apply theme INSTANTLY - uses preloaded CSS, no loading delay
     */
    applyThemeInstant: function(theme) {
        this.log(`⚡ APPLYING THEME INSTANTLY: ${theme}`);
        
        try {
            // Use preloaded CSS or create new
            let themeCSS = document.getElementById('theme-css');
            if (!themeCSS) {
                themeCSS = document.createElement('link');
                themeCSS.id = 'theme-css';
                themeCSS.rel = 'stylesheet';
                document.head.appendChild(themeCSS);
            }
            
            // Use preloaded CSS or fallback to direct loading
            if (this.cssCache[theme]) {
                this.log(`📦 Using preloaded CSS for ${theme}`);
                themeCSS.href = this.cssCache[theme].href;
            } else {
                this.log(`📁 Loading CSS directly for ${theme}`);
                themeCSS.href = `assets/css/themes-${theme}.css`;
            }
            
            // Update body class IMMEDIATELY
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
            
            // Update HTML element
            document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
            document.documentElement.classList.add(`theme-${theme}`);
            
            this.log(`⚡ Body class updated instantly: theme-${theme}`);
            
            // Update icon and status
            this.updateThemeIcon(theme);
            this.updateStatusDisplay();
            
            this.log(`⚡ Theme applied instantly: ${theme}`);
            
        } catch (error) {
            this.log('❌ Instant apply theme error: ' + error.message);
        }
    },
    
    /**
     * Regular toggle (for popup buttons)
     */
    toggleTheme: function() {
        const newTheme = this.current.theme === 'light' ? 'dark' : 'light';
        this.log(`🔄 Regular toggle to: ${newTheme}`);
        this.setTheme(newTheme, 'toggle');
    },
    
    /**
     * Regular set theme (with loading)
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
        } else {
            localStorage.setItem('theme', theme);
        }
        
        this.applyTheme(theme);
        this.log(`✅ Theme set: ${oldTheme} → ${theme}`);
    },
    
    /**
     * Regular apply theme
     */
    applyTheme: function(theme) {
        this.log(`🖌️ APPLYING THEME: ${theme}`);
        
        try {
            let themeCSS = document.getElementById('theme-css');
            if (!themeCSS) {
                themeCSS = document.createElement('link');
                themeCSS.id = 'theme-css';
                themeCSS.rel = 'stylesheet';
                document.head.appendChild(themeCSS);
            }
            
            themeCSS.href = `assets/css/themes-${theme}.css`;
            
            // Update body class
            document.body.className = document.body.className.replace(/theme-\w+/g, '');
            document.body.classList.add(`theme-${theme}`);
            
            // Update HTML element
            document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
            document.documentElement.classList.add(`theme-${theme}`);
            
            this.updateThemeIcon(theme);
            this.updateStatusDisplay();
            
            this.log(`✅ Theme applied: ${theme}`);
            
        } catch (error) {
            this.log('❌ Apply theme error: ' + error.message);
        }
    },
    
    /**
     * Update theme icon
     */
    updateThemeIcon: function(theme) {
        try {
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                const iconName = theme === 'light' ? 'moon' : 'sun';
                themeIcon.setAttribute('data-feather', iconName);
                this.log(`🌙 Icon updated: ${iconName}`);
                
                if (typeof feather !== 'undefined' && feather.replace) {
                    try {
                        feather.replace();
                    } catch (featherError) {
                        this.log('⚠️ Feather replace failed: ' + featherError.message);
                    }
                }
            }
        } catch (error) {
            this.log('⚠️ Icon update failed: ' + error.message);
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
 * Initialize on DOM load (only once)
 */
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (!window.ThemeManager.flags.initialized) {
            ThemeManager.init();
        }
    }, 100);
});

/**
 * Expose globally
 */
window.ThemeManager = ThemeManager;
