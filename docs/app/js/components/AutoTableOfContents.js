import { ContentManifest } from './ContentManifest.js';
import { SmartFileDetector } from './SmartFileDetector.js';

export class AutoTableOfContents {
    constructor() {
        this.manifest = new ContentManifest();
        this.detector = null; // Luodaan myöhemmin kielen mukaan
        this.currentPath = '';
        this.currentLanguage = 'fi';
    }
    
    async generateTOC(contentPath, language = 'fi') {
        this.currentPath = contentPath;
        this.currentLanguage = language;
        
        // Luo detector oikealla kielellä
        this.detector = new SmartFileDetector(language);
        
        try {
            console.log(`📚 Auto-generating TOC for: ${contentPath} (${language})`);
            
            const files = await this.manifest.getDirectoryContents(contentPath);
            
            if (files.length === 0) {
                return this.renderEmptyStateWithSuggestions(contentPath);
            }
            
            // Analysoi ja kategorisoi yhdessä operaatiossa
            const analysis = this.detector.analyzeFileStructure(files);
            const categorizedFiles = this.detector.categorizeAndGroup(files);
            
            console.log('📊 File structure analysis:', analysis);
            
            return this.renderTOC(categorizedFiles, analysis);
            
        } catch (error) {
            console.error('TOC generation failed:', error);
            return this.renderErrorStateWithRetry(error, contentPath);
        }
    }
    
    renderTOC(categorizedFiles, analysis) {
        let html = '<div class="auto-toc">';
        
        // Otsikko kielellä
        const title = this.currentLanguage === 'fi' ? 
            '📁 Projektin Sisältö' : 
            '📁 Project Contents';
        html += `<h2>${title}</h2>`;
        
        // Yhteenveto
        html += this.renderAnalysisSummary(analysis);
        
        // Kategoriat
        for (const [categoryKey, category] of Object.entries(categorizedFiles)) {
            html += this.renderCategory(category);
        }
        
        // Puuttuvien tiedostojen ehdotukset
        const suggestions = this.detector.suggestMissingFiles(analysis, this.currentPath);
        if (suggestions.length > 0) {
            html += this.renderMissingSuggestions(suggestions);
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
        const route = `${this.currentPath}/${file.name.replace('.md', '')}`;
        
        return `
            <li class="file-item">
                <a href="#${route}" class="file-link" data-file="${file.name}">
                    <span class="file-name">${file.displayName}</span>
                    <span class="file-meta">${this.getFileMetadata(file)}</span>
                </a>
            </li>
        `;
    }
    
    getFileMetadata(file) {
        const parts = [];
        
        const numberMatch = file.name.match(/(?:phase|module|vaihe|moduuli)[\s_]*(\d+)/i);
        if (numberMatch) {
            const isPhase = /phase|vaihe/i.test(file.name);
            const type = isPhase ? 
                (this.currentLanguage === 'fi' ? 'Vaihe' : 'Phase') :
                (this.currentLanguage === 'fi' ? 'Moduuli' : 'Module');
            parts.push(`${type} ${numberMatch[1]}`);
        }
        
        if (file.name.includes('results') || file.name.includes('tulokset')) {
            parts.push(this.currentLanguage === 'fi' ? 'Tulokset' : 'Results');
        } else if (file.name.includes('documentation') || file.name.includes('dokumentaatio')) {
            parts.push(this.currentLanguage === 'fi' ? 'Dokumentaatio' : 'Documentation');
        } else if (file.name.includes('code') || file.name.includes('koodi')) {
            parts.push(this.currentLanguage === 'fi' ? 'Koodi' : 'Code');
        }
        
        return parts.join(' • ');
    }
    
    renderAnalysisSummary(analysis) {
        const fileText = this.currentLanguage === 'fi' ? 'tiedostoa' : 'files';
        const phaseText = this.currentLanguage === 'fi' ? 'vaihetta' : 'phases';
        const moduleText = this.currentLanguage === 'fi' ? 'moduulia' : 'modules';
        
        return `
            <div class="toc-summary">
                <div class="summary-stats">
                    <span class="stat">📄 ${analysis.totalFiles} ${fileText}</span>
                    ${analysis.phases.length > 0 ? `<span class="stat">⚙️ ${analysis.phases.length} ${phaseText}</span>` : ''}
                    ${analysis.modules.length > 0 ? `<span class="stat">💻 ${analysis.modules.length} ${moduleText}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    renderMissingSuggestions(suggestions) {
        if (suggestions.length === 0) return '';
        
        const title = this.currentLanguage === 'fi' ? 'Ehdotetut Lisäykset' : 'Suggested Additions';
        const description = this.currentLanguage === 'fi' ? 
            'Puuttuvat tiedostot joita projekti voisi tarvita' :
            'Missing files that the project might need';
        
        let html = `
            <div class="toc-suggestions">
                <div class="category-header">
                    <span class="category-icon">💡</span>
                    <h3 class="category-title">${title}</h3>
                    <span class="file-count">(${suggestions.length})</span>
                </div>
                <p class="category-description">${description}</p>
                <ul class="suggestion-list">
        `;
        
        suggestions.forEach(suggestion => {
            html += `
                <li class="suggestion-item">
                    <span class="suggestion-name">${suggestion.fileName}</span>
                    <span class="suggestion-reason">${suggestion.reason}</span>
                </li>
            `;
        });
        
        html += `
                </ul>
            </div>
        `;
        
        return html;
    }
    
    renderEmptyStateWithSuggestions(contentPath) {
        const suggestions = this.detector.generateLikelyFileNames(contentPath, this.currentLanguage);
        
        const texts = this.currentLanguage === 'fi' ? {
            title: '📁 Projektin Sisältö',
            notFound: '🔍 Sisältöä ei löytynyt automaattisessa skannauksessa.',
            tryAdding: 'Kokeile lisätä jokin näistä tiedostoista:',
            suggestedFiles: '💡 Ehdotetut tiedostonimet:',
            hint: 'Kun lisäät tiedoston kansioon, päivitä sivu niin se ilmestyy automaattisesti!'
        } : {
            title: '📁 Project Contents',
            notFound: '🔍 No content found in automatic scan.',
            tryAdding: 'Try adding one of these files:',
            suggestedFiles: '💡 Suggested filenames:',
            hint: 'When you add a file to the folder, refresh the page and it will appear automatically!'
        };
        
        let html = `
            <div class="auto-toc empty-state">
                <h2>${texts.title}</h2>
                <div class="empty-message">
                    <p>${texts.notFound}</p>
                    <p>${texts.tryAdding}</p>
                </div>
                <div class="suggested-files">
                    <h4>${texts.suggestedFiles}</h4>
                    <ul>
        `;
        
        suggestions.slice(0, 8).forEach(suggestion => {
            html += `<li><code>${suggestion}</code></li>`;
        });
        
        html += `
                    </ul>
                    <p class="auto-hint">
                        <strong>${this.currentLanguage === 'fi' ? 'Vinkki:' : 'Hint:'}</strong> ${texts.hint}
                    </p>
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderErrorStateWithRetry(error, contentPath) {
        const texts = this.currentLanguage === 'fi' ? {
            title: '📁 Projektin Sisältö',
            failed: '⚠️ Automaattinen skannaus epäonnistui.',
            reasons: 'Syitä voi olla:',
            retry: '🔄 Yritä uudelleen',
            technical: 'Teknisiä tietoja'
        } : {
            title: '📁 Project Contents',
            failed: '⚠️ Automatic scan failed.',
            reasons: 'Possible reasons:',
            retry: '🔄 Try again',
            technical: 'Technical details'
        };
        
        return `
            <div class="auto-toc error-state">
                <h2>${texts.title}</h2>
                <div class="error-message">
                    <p>${texts.failed}</p>
                    <p>${texts.reasons}</p>
                    <ul>
                        <li>GitHub API rate limit</li>
                        <li>${this.currentLanguage === 'fi' ? 'Repository ei ole julkinen' : 'Repository is not public'}</li>
                        <li>${this.currentLanguage === 'fi' ? 'Verkko-ongelma' : 'Network issue'}</li>
                    </ul>
                    
                    <button onclick="window.location.reload()" class="retry-btn">
                        ${texts.retry}
                    </button>
                    
                    <details class="error-details">
                        <summary>${texts.technical}</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    // Päivitetty injectTOC kaksikielisyydellä
    async injectTOC(containerSelector = '.content-container', language = 'fi') {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        
        const firstHeading = container.querySelector('h2');
        const tocHtml = await this.generateTOC(this.currentPath, language);
        
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

// Debug function
window.debugTOC = async (path, language = 'fi') => {
    const toc = new AutoTableOfContents();
    const detector = new SmartFileDetector(language);
    
    console.log(`🔍 DEBUG: Scanning directory ${path} (${language})`);
    
    try {
        const files = await toc.manifest.getDirectoryContents(path);
        console.log(`✅ Found ${files.length} files:`, files);
        
        const analysis = detector.analyzeFileStructure(files);
        console.log(`📊 Analysis:`, analysis);
        
        const categorized = detector.categorizeAndGroup(files);
        console.log(`📁 Categorized:`, categorized);
        
        const suggestions = detector.suggestMissingFiles(analysis, path);
        console.log(`💡 Suggestions:`, suggestions);
        
    } catch (error) {
        console.error(`❌ DEBUG failed:`, error);
    }
};
