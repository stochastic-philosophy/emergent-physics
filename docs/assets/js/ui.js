/**
 * UI Manipulation and DOM Tools
 * Handles all user interface operations, loading states, and DOM utilities
 */

window.UI = {
    
    // UI state
    state: {
        isLoading: false,
        currentModal: null,
        notifications: []
    },
    
    // Element selectors
    selectors: {
        loadingOverlay: '#loading-overlay',
        mainContent: '#main-content',
        projectsList: '#projects-list',
        themeToggle: '#theme-toggle',
        languageButtons: '.lang-btn'
    },
    
    /**
     * Show loading overlay
     */
    showLoading: function(message = null) {
        const overlay = document.querySelector(this.selectors.loadingOverlay);
        if (overlay) {
            if (message) {
                const messageElement = overlay.querySelector('p');
                if (messageElement) {
                    messageElement.textContent = message;
                }
            }
            overlay.style.display = 'flex';
            this.state.isLoading = true;
            DEBUG.info('Loading overlay shown');
        } else {
            DEBUG.warn('Loading overlay element not found');
        }
    },
    
    /**
     * Hide loading overlay
     */
    hideLoading: function() {
        const overlay = document.querySelector(this.selectors.loadingOverlay);
        if (overlay) {
            overlay.style.display = 'none';
            this.state.isLoading = false;
            DEBUG.info('Loading overlay hidden');
        }
    },
    
    /**
     * Show error message with optional back button
     */
    showError: function(message, showBackButton = false) {
        const contentArea = document.querySelector(this.selectors.mainContent);
        if (!contentArea) {
            DEBUG.error('Content area not found for error display');
            return;
        }
        
        const currentLang = this.getCurrentLanguage();
        const backText = currentLang === 'fi' ? '← Takaisin etusivulle' : '← Back to Home';
        const errorTitle = currentLang === 'fi' ? 'Virhe' : 'Error';
        const reloadText = currentLang === 'fi' ? 'Päivitä sivu' : 'Reload Page';
        
        let html = '<div class="project-content">';
        
        if (showBackButton) {
            html += `
                <nav class="project-navigation">
                    ${this.createBackButton(backText)}
                </nav>
            `;
        }
        
        html += `
            <div class="error-message">
                <h2>${errorTitle}</h2>
                <p>${Utils.escapeHtml(message)}</p>
                <button onclick="location.reload()" class="reload-btn">
                    ${reloadText}
                </button>
            </div>
        </div>`;
        
        contentArea.innerHTML = html;
        DEBUG.error(`Error displayed: ${message}`);
    },
    
    /**
     * Create back button with styling
     */
    createBackButton: function(text) {
        return `
            <button 
                class="back-to-home-btn" 
                onclick="Navigation.goBackToHome()"
                style="
                    background: transparent;
                    border: 1px solid #e5e7eb;
                    color: #6b7280;
                    padding: 0.75rem 1.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-family: inherit;
                    text-decoration: none;
                    transition: all 0.3s ease;
                "
                onmouseover="this.style.background='#2563eb'; this.style.color='#ffffff'; this.style.borderColor='#2563eb';"
                onmouseout="this.style.background='transparent'; this.style.color='#6b7280'; this.style.borderColor='#e5e7eb';"
            >
                ${text}
            </button>
        `;
    },
    
    /**
     * Show welcome screen
     */
    showWelcomeScreen: function() {
        DEBUG.info('Displaying welcome screen');
        const contentArea = document.querySelector(this.selectors.mainContent);
        if (!contentArea) {
            DEBUG.error('Content area not found for welcome screen!');
            return;
        }
        
        const currentLang = this.getCurrentLanguage();
        const welcomeTitle = currentLang === 'fi' ? 'Tervetuloa tutkimusalustalle' : 'Welcome to Research Platform';
        const welcomeDesc = currentLang === 'fi' ? 
            'Valitse vasemmalta projekti aloittaaksesi tutustumisen tutkimustuloksiin.' :
            'Select a project from the left to start exploring research results.';
        const statusTheme = currentLang === 'fi' ? 'Teema' : 'Theme';
        const statusLang = currentLang === 'fi' ? 'Kieli' : 'Language';
        
        let currentTheme = 'Unknown';
        let currentLanguage = 'Unknown';
        
        if (typeof ThemeManager !== 'undefined' && ThemeManager.getTheme) {
            const theme = ThemeManager.getTheme();
            currentTheme = currentLang === 'fi' ? 
                (theme === 'light' ? 'Vaalea' : 'Tumma') :
                (theme === 'light' ? 'Light' : 'Dark');
        }
        
        if (currentLang) {
            currentLanguage = currentLang === 'fi' ? 'Suomi' : 'English';
        }
        
        contentArea.innerHTML = `
            <div class="welcome-screen">
                <h1 data-key="welcome_title">${welcomeTitle}</h1>
                <p data-key="welcome_description">${welcomeDesc}</p>
                
                <div class="status-indicator">
                    <div class="status-item">
                        <span data-key="status_theme">${statusTheme}:</span>
                        <span id="current-theme-display">${currentTheme}</span>
                    </div>
                    <div class="status-item">
                        <span data-key="status_language">${statusLang}:</span>
                        <span id="current-language-display">${currentLanguage}</span>
                    </div>
                </div>
            </div>
        `;
        
        DEBUG.success('Welcome screen displayed successfully');
    },
    
    /**
     * Create DOM element with properties and children
     */
    createElement: function(tag, props = {}, children = []) {
        const element = document.createElement(tag);
        
        // Set properties
        Object.entries(props).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Add children
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else if (child instanceof Node) {
                element.appendChild(child);
            }
        });
        
        return element;
    },
    
    /**
     * Show notification
     */
    showNotification: function(message, type = 'info', duration = 5000) {
        const notification = this.createElement('div', {
            className: `notification notification-${type}`,
            style: `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 6px;
                color: white;
                z-index: 10000;
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
            `,
            innerHTML: Utils.escapeHtml(message)
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto remove
        const timeoutId = setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            clearTimeout(timeoutId);
            this.removeNotification(notification);
        });
        
        this.state.notifications.push({ element: notification, timeoutId });
        DEBUG.info(`Notification shown: ${message}`);
    },
    
    /**
     * Remove notification
     */
    removeNotification: function(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
        
        // Remove from state
        this.state.notifications = this.state.notifications.filter(n => n.element !== notification);
    },
    
    /**
     * Clear all notifications
     */
    clearNotifications: function() {
        this.state.notifications.forEach(({ element, timeoutId }) => {
            clearTimeout(timeoutId);
            this.removeNotification(element);
        });
        this.state.notifications = [];
    },
    
    /**
     * Toggle element visibility
     */
    toggleVisibility: function(selector, force = null) {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const isVisible = element.style.display !== 'none';
        const shouldShow = force !== null ? force : !isVisible;
        
        element.style.display = shouldShow ? 'block' : 'none';
        return shouldShow;
    },
    
    /**
     * Smooth scroll to element
     */
    scrollToElement: function(selector, offset = 0) {
        const element = document.querySelector(selector);
        if (!element) return false;
        
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        return true;
    },
    
    /**
     * Get current language from ThemeManager or fallback
     */
    getCurrentLanguage: function() {
        if (typeof ThemeManager !== 'undefined' && ThemeManager.getLanguage) {
            return ThemeManager.getLanguage();
        }
        return Storage.getLanguage();
    },
    
    /**
     * Get current theme from ThemeManager or fallback
     */
    getCurrentTheme: function() {
        if (typeof ThemeManager !== 'undefined' && ThemeManager.getTheme) {
            return ThemeManager.getTheme();
        }
        return Storage.getTheme();
    },
    
    /**
     * Highlight active project in sidebar
     */
    highlightActiveProject: function(projectId) {
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and highlight the active project
        const currentLang = this.getCurrentLanguage();
        projectItems.forEach(item => {
            const titleElement = item.querySelector('.project-title');
            if (titleElement) {
                const projectData = item.dataset.projectId || this.extractProjectIdFromTitle(titleElement.textContent, projectId);
                if (projectData === projectId) {
                    item.classList.add('active');
                    DEBUG.info(`Highlighted project: ${projectId}`);
                }
            }
        });
    },
    
    /**
     * Extract project ID from title (helper function)
     */
    extractProjectIdFromTitle: function(title, targetId) {
        // This is a simple matching function - can be improved
        return title.toLowerCase().includes(targetId.toLowerCase()) ? targetId : null;
    },
    
    /**
     * Update page title
     */
    updatePageTitle: function(title) {
        const baseTitle = 'Emergent Physics Research';
        document.title = title ? `${title} - ${baseTitle}` : baseTitle;
    },
    
    /**
     * Check if element is in viewport
     */
    isInViewport: function(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    /**
     * Debounced window resize handler
     */
    onResize: function(callback, delay = 250) {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(callback, delay);
    },
    
    /**
     * Add loading state to button
     */
    setButtonLoading: function(button, loading = true) {
        if (typeof button === 'string') {
            button = document.querySelector(button);
        }
        
        if (!button) return;
        
        if (loading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = 'Loading...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
            button.classList.remove('loading');
            delete button.dataset.originalText;
        }
    },
    
    /**
     * Focus management for accessibility
     */
    manageFocus: function(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        
        if (element && element.focus) {
            element.focus();
            
            // Add visible focus indicator if needed
            element.style.outline = '2px solid #2563eb';
            element.style.outlineOffset = '2px';
            
            // Remove outline after blur
            element.addEventListener('blur', function removeOutline() {
                element.style.outline = '';
                element.style.outlineOffset = '';
                element.removeEventListener('blur', removeOutline);
            });
        }
    }
};

// Initialize UI management
document.addEventListener('DOMContentLoaded', function() {
    DEBUG.info('UI module loaded successfully');
    
    // Set up global UI event handlers
    window.addEventListener('resize', () => {
        UI.onResize(() => {
            DEBUG.info('Window resized, updating layout');
        });
    });
    
    // Clear notifications on page unload
    window.addEventListener('beforeunload', () => {
        UI.clearNotifications();
    });
});

/**
 * Export for Node.js compatibility (if needed)
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
