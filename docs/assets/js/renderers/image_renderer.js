/**
 * Image Renderer - Käsittelee kuvatiedostot
 * Responsiivinen kuvan näyttö zoom-toiminnallisuudella
 * 
 * DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua (kuten theme-debug popup)
 * Tabletit eivät tue console.log komponentteja selaimissa.
 */

window.image_renderer = {
    
    /**
     * Renderöi PNG kuva
     */
    render: async function(content, fileName, filePath) {
        let html = '<div class="png-content" id="main-image-content">';
        
        // Image info header
        html += this.createImageHeader(fileName, filePath);
        
        // Image display
        html += this.createImageDisplay(filePath, fileName);
        
        // Image actions
        html += this.createImageActions(filePath, fileName);
        
        html += '</div>';
        
        return html;
    },
    
    /**
     * Post-processing: image loading, zoom ja styles
     */
    postProcess: async function(contentArea, content, fileName) {
        try {
            // Setup image loading
            this.setupImageLoading(contentArea);
            
            // Setup zoom functionality
            this.setupZoomFunctionality(contentArea);
            
            // Copy URL button
            this.addCopyUrlButton(contentArea);
            
            // Image styles
            this.addImageStyles();
            
        } catch (error) {
            // Silent error handling
        }
    },
    
    /**
     * Luo kuvan header
     */
    createImageHeader: function(fileName, filePath) {
        return `<div class="image-header">
            <div class="file-type-info">
                <span class="file-type-label">🖼️ PNG Image</span>
                <span class="file-name">${this.escapeHtml(fileName)}</span>
            </div>
            <div class="image-info" id="image-meta">
                <span class="loading-text">Loading image...</span>
            </div>
        </div>`;
    },
    
    /**
     * Luo kuvan näyttö
     */
    createImageDisplay: function(filePath, fileName) {
        return `<div class="image-container" id="image-container">
            <div class="image-loading" id="image-loading">
                <div class="loading-spinner">⏳</div>
                <span>Loading image...</span>
            </div>
            <img 
                id="main-image" 
                src="${filePath}" 
                alt="${this.escapeHtml(fileName)}"
                class="main-image"
                style="display: none;"
                data-filename="${this.escapeHtml(fileName)}"
                data-filepath="${this.escapeHtml(filePath)}"
            />
            <div class="image-error" id="image-error" style="display: none;">
                <span class="error-icon">⚠️</span>
                <span class="error-text">Failed to load image</span>
                <button class="retry-btn" onclick="png_renderer.retryImageLoad()">Retry</button>
            </div>
        </div>`;
    },
    
    /**
     * Luo kuvan toiminnot
     */
    createImageActions: function(filePath, fileName) {
        return `<div class="image-actions">
            <button class="zoom-btn" id="zoom-btn" onclick="png_renderer.toggleZoom()" disabled>
                🔍 Zoom
            </button>
            <button class="copy-url-btn" id="copy-url-btn">
                🔗 Copy URL
            </button>
            <button class="download-btn" onclick="png_renderer.downloadImage('${filePath}', '${fileName}')">
                📥 Download
            </button>
        </div>`;
    },
    
    /**
     * Setup kuvan lataus
     */
    setupImageLoading: function(container) {
        const img = container.querySelector('#main-image');
        const loading = container.querySelector('#image-loading');
        const error = container.querySelector('#image-error');
        const metaInfo = container.querySelector('#image-meta');
        const zoomBtn = container.querySelector('#zoom-btn');
        
        if (!img) return;
        
        img.addEventListener('load', () => {
            // Kuva latautui onnistuneesti
            loading.style.display = 'none';
            error.style.display = 'none';
            img.style.display = 'block';
            
            // Näytä kuvan metadata
            this.updateImageMetadata(img, metaInfo);
            
            // Aktivoi zoom button
            if (zoomBtn) zoomBtn.disabled = false;
        });
        
        img.addEventListener('error', () => {
            // Kuvan lataus epäonnistui
            loading.style.display = 'none';
            img.style.display = 'none';
            error.style.display = 'flex';
            
            // Päivitä metadata
            if (metaInfo) {
                metaInfo.innerHTML = '<span class="error-text">Failed to load image</span>';
            }
        });
    },
    
    /**
     * Päivitä kuvan metadata
     */
    updateImageMetadata: function(img, metaContainer) {
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;
        const displayWidth = img.offsetWidth;
        const displayHeight = img.offsetHeight;
        
        const isScaled = naturalWidth !== displayWidth || naturalHeight !== displayHeight;
        
        let metaHtml = `
            <span class="dimension">📐 ${naturalWidth} × ${naturalHeight}px</span>
        `;
        
        if (isScaled) {
            metaHtml += `<span class="scaled">📱 Scaled to ${displayWidth} × ${displayHeight}px</span>`;
        }
        
        // Arvioitu tiedostokoko (ei tarkkaa tietoa, mutta antaa käsityksen)
        const estimatedSize = this.estimateImageSize(naturalWidth, naturalHeight);
        metaHtml += `<span class="size">💾 ~${estimatedSize}</span>`;
        
        if (metaContainer) {
            metaContainer.innerHTML = metaHtml;
        }
    },
    
    /**
     * Arvioitu tiedostokoko
     */
    estimateImageSize: function(width, height) {
        // Karkea arvio PNG:lle (24-bit + alpha + kompressio)
        const pixels = width * height;
        const bytes = pixels * 3; // Keskimääräinen kompressio
        
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    },
    
    /**
     * Setup zoom-toiminnallisuus
     */
    setupZoomFunctionality: function(container) {
        const img = container.querySelector('#main-image');
        const imageContainer = container.querySelector('#image-container');
        
        if (!img || !imageContainer) return;
        
        // Click to zoom
        img.addEventListener('click', () => {
            this.toggleZoom();
        });
        
        // Cursor pointer kun zoom on mahdollinen
        img.style.cursor = 'zoom-in';
    },
    
    /**
     * Toggle zoom
     */
    toggleZoom: function() {
        const img = document.querySelector('#main-image');
        const container = document.querySelector('#image-container');
        const zoomBtn = document.querySelector('#zoom-btn');
        
        if (!img || !container) return;
        
        const isZoomed = container.classList.contains('zoomed');
        
        if (isZoomed) {
            // Zoom out
            container.classList.remove('zoomed');
            img.style.cursor = 'zoom-in';
            if (zoomBtn) zoomBtn.textContent = '🔍 Zoom';
        } else {
            // Zoom in
            container.classList.add('zoomed');
            img.style.cursor = 'zoom-out';
            if (zoomBtn) zoomBtn.textContent = '🔍 Zoom Out';
        }
    },
    
    /**
     * Copy URL button
     */
    addCopyUrlButton: function(container) {
        const copyBtn = container.querySelector('#copy-url-btn');
        const img = container.querySelector('#main-image');
        
        if (!copyBtn || !img) return;
        
        copyBtn.addEventListener('click', async () => {
            try {
                const url = img.src;
                await Utils.copyToClipboard(url);
                copyBtn.innerHTML = '✅ Copied';
                setTimeout(() => {
                    copyBtn.innerHTML = '🔗 Copy URL';
                }, 2000);
            } catch (error) {
                copyBtn.innerHTML = '❌ Failed';
                setTimeout(() => {
                    copyBtn.innerHTML = '🔗 Copy URL';
                }, 2000);
            }
        });
    },
    
    /**
     * Retry image load
     */
    retryImageLoad: function() {
        const img = document.querySelector('#main-image');
        const loading = document.querySelector('#image-loading');
        const error = document.querySelector('#image-error');
        
        if (!img) return;
        
        // Näytä loading, piilota error
        if (loading) loading.style.display = 'flex';
        if (error) error.style.display = 'none';
        
        // Force reload by adding timestamp
        const originalSrc = img.getAttribute('data-filepath') || img.src;
        img.src = originalSrc + '?t=' + Date.now();
    },
    
    /**
     * Download kuva
     */
    downloadImage: function(filePath, fileName) {
        try {
            const link = document.createElement('a');
            link.href = filePath;
            link.download = fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Success notification
            if (UI && UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Kuvan lataus aloitettu' : 'Image download started';
                UI.showNotification(message, 'success');
            }
            
        } catch (error) {
            // Error notification
            if (UI && UI.showNotification) {
                const currentLang = UI.getCurrentLanguage();
                const message = currentLang === 'fi' ? 'Kuvan lataus epäonnistui' : 'Image download failed';
                UI.showNotification(message, 'error');
            }
        }
    },
    
    /**
     * Image-specific styles
     */
    addImageStyles: function() {
        if (document.getElementById('png-renderer-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'png-renderer-styles';
        style.textContent = `
            .png-content {
                margin: 1rem 0;
            }
            
            .image-header {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-bottom: none;
                border-radius: 6px 6px 0 0;
                padding: 0.75rem 1rem;
            }
            
            .file-type-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .file-type-label {
                font-weight: 600;
                color: #374151;
            }
            
            .file-name {
                color: #6b7280;
                font-size: 0.875rem;
            }
            
            .image-info {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
                font-size: 0.875rem;
                color: #6b7280;
            }
            
            .loading-text, .error-text {
                color: #9ca3af;
            }
            
            .image-container {
                border: 1px solid #e2e8f0;
                border-radius: 0 0 6px 6px;
                border-top: none;
                background: #f9fafb;
                min-height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                overflow: hidden;
            }
            
            .image-loading {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                color: #6b7280;
            }
            
            .loading-spinner {
                font-size: 1.5rem;
                animation: spin 2s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .image-error {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 0.5rem;
                color: #dc2626;
            }
            
            .error-icon {
                font-size: 2rem;
            }
            
            .retry-btn {
                background: #2563eb;
                color: white;
                border: none;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.875rem;
                margin-top: 0.5rem;
            }
            
            .retry-btn:hover {
                background: #1d4ed8;
            }
            
            .main-image {
                max-width: 100%;
                max-height: 70vh;
                height: auto;
                border-radius: 4px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                transition: transform 0.3s ease;
            }
            
            .image-container.zoomed {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                background: rgba(0, 0, 0, 0.9);
                border-radius: 0;
                border: none;
            }
            
            .image-container.zoomed .main-image {
                max-width: 90vw;
                max-height: 90vh;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }
            
            .image-actions {
                display: flex;
                gap: 0.5rem;
                justify-content: center;
                padding: 1rem;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-top: none;
                border-radius: 0 0 6px 6px;
            }
            
            .image-actions button {
                background: transparent;
                border: 1px solid #d1d5db;
                padding: 0.5rem 1rem;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.875rem;
                transition: all 0.3s ease;
            }
            
            .image-actions button:hover:not(:disabled) {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .image-actions button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .zoom-btn:hover:not(:disabled) {
                background: #dbeafe;
                border-color: #2563eb;
                color: #2563eb;
            }
            
            .copy-url-btn:hover {
                background: #f0f9ff;
                border-color: #0ea5e9;
                color: #0ea5e9;
            }
            
            .download-btn:hover {
                background: #dcfce7;
                border-color: #16a34a;
                color: #16a34a;
            }
            
            /* Mobile responsive */
            @media (max-width: 768px) {
                .image-actions {
                    flex-direction: column;
                }
                
                .image-info {
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .file-type-info {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 0.25rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    },
    
    /**
     * Escape HTML
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // DEBUG: Jos debuggausta tarvitaan, käytä popup-ratkaisua theme-debugin tapaan
    // console.log ei toimi tableteilla
});

/**
 * Export for Node.js compatibility
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = png_renderer;
}
