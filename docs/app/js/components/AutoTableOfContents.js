import { ContentManifest } from './ContentManifest.js';
import { ContentCategorizer } from './ContentCategorizer.js';

export class AutoTableOfContents {
    constructor() {
        this.manifest = new ContentManifest();
        this.categorizer = new ContentCategorizer();
        this.currentPath = '';
    }
    
    async generateTOC(contentPath) {
        this.currentPath = contentPath;
        
        try {
            console.log(`📚 Generating TOC for: ${contentPath}`);
            
            const files = await this.manifest.getDirectoryContents(contentPath);
            
            if (files.length === 0) {
                return this.renderEmptyState();
            }
            
            const categorizedFiles = this.categorizer.groupFilesByCategory(files);
            return this.renderTOC(categorizedFiles);
            
        } catch (error) {
            console.error('TOC generation failed:', error);
            return this.renderErrorState(error);
        }
    }
    
    renderTOC(categorizedFiles) {
        let html = '<div class="auto-toc">';
        html += '<h2>📁 Projektin Sisältö</h2>';
        
        for (const [categoryKey, category] of Object.entries(categorizedFiles)) {
            html += this.renderCategory(category);
        }
        
        html += '</div>';
        return html;
    }
    
    renderCategory(category) {
        let html = `
            <div class="toc-category" data-category="${category.category}">
                <div class="category-header">
                    <span class="category-icon">${category.icon}</span>
                    <h3 class="category-title">${category.title}</h3>
                    <span class="file-count">(${category.files.length})</span>
                </div>
                <p class="category-description">${category.description}</p>
                <ul class="file-list">
        `;
        
        for (const file of category.files) {
            html += this.renderFileItem(file);
        }
        
        html += `
                </ul>
            </div>
        `;
        
        return html;
    }
    
    renderFileItem(file) {
        const route = `${this.currentPath}/${file.fileName.replace('.md', '')}`;
        
        return `
            <li class="file-item">
                <a href="#${route}" class="file-link" data-file="${file.fileName}">
                    <span class="file-name">${file.displayName}</span>
                    <span class="file-meta">${this.getFileMetadata(file)}</span>
                </a>
            </li>
        `;
    }
    
    getFileMetadata(file) {
        const parts = [];
        
        const numberMatch = file.fileName.match(/(?:phase|module)[\s_]*(\d+)/i);
        if (numberMatch) {
            const type = file.fileName.toLowerCase().includes('phase') ? 'Vaihe' : 'Moduuli';
            parts.push(`${type} ${numberMatch[1]}`);
        }
        
        if (file.fileName.includes('results')) {
            parts.push('Tulokset');
        } else if (file.fileName.includes('documentation')) {
            parts.push('Dokumentaatio');
        } else if (file.fileName.includes('code')) {
            parts.push('Koodi');
        }
        
        return parts.join(' • ');
    }
    
    renderEmptyState() {
        return `
            <div class="auto-toc empty-state">
                <h2>📁 Projektin Sisältö</h2>
                <div class="empty-message">
                    <p>🔍 Sisältöä ei löytynyt tästä kansiosta.</p>
                    <p>Tiedostoja ei ole vielä lisätty tai manifest.json puuttuu.</p>
                </div>
            </div>
        `;
    }
    
    renderErrorState(error) {
        return `
            <div class="auto-toc error-state">
                <h2>📁 Projektin Sisältö</h2>
                <div class="error-message">
                    <p>⚠️ Sisällysluettelon lataaminen epäonnistui.</p>
                    <details>
                        <summary>Teknisiä tietoja</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    async injectTOC(containerSelector = '.content-container') {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const firstHeading = container.querySelector('h2');
        const tocHtml = await this.generateTOC(this.currentPath);
        
        const tocDiv = document.createElement('div');
        tocDiv.innerHTML = tocHtml;
        
        if (firstHeading) {
            firstHeading.parentNode.insertBefore(tocDiv, firstHeading);
        } else {
            container.insertAdjacentElement('afterbegin', tocDiv);
        }
        
        this.setupTOCInteractions(tocDiv);
    }
    
    setupTOCInteractions(tocContainer) {
        const categoryHeaders = tocContainer.querySelectorAll('.category-header');
        categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const category = header.closest('.toc-category');
                category.classList.toggle('collapsed');
            });
        });
        
        const fileLinks = tocContainer.querySelectorAll('.file-link');
        fileLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                console.log(`📄 Opening file: ${link.dataset.file}`);
            });
        });
    }
}
