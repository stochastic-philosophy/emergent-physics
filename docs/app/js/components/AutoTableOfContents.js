import { ContentManifest } from './ContentManifest.js';
import { ContentCategorizer } from './ContentCategorizer.js';
import { SmartFileDetector } from './SmartFileDetector.js';

export class AutoTableOfContents {
    constructor() {
        this.manifest = new ContentManifest();
        this.categorizer = new ContentCategorizer();
        this.detector = new SmartFileDetector();
        this.currentPath = '';
    }
    
    async generateTOC(contentPath) {
        this.currentPath = contentPath;
        
        try {
            console.log(`📚 Auto-generating TOC for: ${contentPath}`);
            
            // Hae tiedostolista automaattisesti
            const files = await this.manifest.getDirectoryContents(contentPath);
            
            if (files.length === 0) {
                return this.renderEmptyStateWithSuggestions(contentPath);
            }
            
            // Analysoi löydetty rakenne
            const analysis = this.detector.analyzeFileStructure(files);
            console.log('📊 File structure analysis:', analysis);
            
            // Kategorisoi tiedostot
            const categorizedFiles = this.categorizer.groupFilesByCategory(files);
            
            // Renderöi TOC
            return this.renderTOC(categorizedFiles, analysis);
            
        } catch (error) {
            console.error('TOC generation failed:', error);
            return this.renderErrorStateWithRetry(error, contentPath);
        }
    }
    
    renderTOC(categorizedFiles, analysis) {
        let html = '<div class="auto-toc">';
        html += '<h2>📁 Projektin Sisältö</h2>';
        
        // Lisää yhteenveto
        html += this.renderAnalysisSummary(analysis);
        
        // Renderöi kategoriat
        for (const [categoryKey, category] of Object.entries(categorizedFiles)) {
            html += this.renderCategory(category);
        }
        
        // Lisää puuttuvien tiedostojen ehdotukset
        const suggestions = this.detector.suggestMissingFiles(analysis, this.currentPath);
        if (suggestions.length > 0) {
            html += this.renderMissingSuggestions(suggestions);
        }
        
        html += '</div>';
        return html;
    }
    
    renderAnalysisSummary(analysis) {
        return `
            <div class="toc-summary">
                <div class="summary-stats">
                    <span class="stat">📄 ${analysis.totalFiles} tiedostoa</span>
                    ${analysis.phases.length > 0 ? `<span class="stat">⚙️ ${analysis.phases.length} vaihetta</span>` : ''}
                    ${analysis.modules.length > 0 ? `<span class="stat">💻 ${analysis.modules.length} moduulia</span>` : ''}
                </div>
            </div>
        `;
    }
    
    renderMissingSuggestions(suggestions) {
        if (suggestions.length === 0) return '';
        
        let html = `
            <div class="toc-suggestions">
                <div class="category-header">
                    <span class="category-icon">💡</span>
                    <h3 class="category-title">Ehdotetut Lisäykset</h3>
                    <span class="file-count">(${suggestions.length})</span>
                </div>
                <p class="category-description">Puuttuvat tiedostot joita projekti voisi tarvita</p>
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
        const language = contentPath.includes('/fi/') ? 'fi' : 'en';
        const suggestions = this.detector.generateLikelyFileNames(contentPath, language);
        
        let html = `
            <div class="auto-toc empty-state">
                <h2>📁 Projektin Sisältö</h2>
                <div class="empty-message">
                    <p>🔍 Sisältöä ei löytynyt automaattisessa skannauksessa.</p>
                    <p>Kokeile lisätä jokin näistä tiedostoista:</p>
                </div>
                <div class="suggested-files">
                    <h4>💡 Ehdotetut tiedostonimet:</h4>
                    <ul>
        `;
        
        suggestions.slice(0, 8).forEach(suggestion => {
            html += `<li><code>${suggestion}</code></li>`;
        });
        
        html += `
                    </ul>
                    <p class="auto-hint">
                        <strong>Vinkki:</strong> Kun lisäät tiedoston kansioon, päivitä sivu niin se ilmestyy automaattisesti!
                    </p>
                </div>
            </div>
        `;
        
        return html;
    }
    
    renderErrorStateWithRetry(error, contentPath) {
        return `
            <div class="auto-toc error-state">
                <h2>📁 Projektin Sisältö</h2>
                <div class="error-message">
                    <p>⚠️ Automaattinen skannaus epäonnistui.</p>
                    <p>Syitä voi olla:</p>
                    <ul>
                        <li>GitHub API rate limit</li>
                        <li>Repository ei ole julkinen</li>
                        <li>Verkko-ongelma</li>
                    </ul>
                    
                    <button onclick="window.location.reload()" class="retry-btn">
                        🔄 Yritä uudelleen
                    </button>
                    
                    <details class="error-details">
                        <summary>Teknisiä tietoja</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    // Lisää debug-toiminto kehitykseen
    async debugDirectoryContents(contentPath) {
        console.log(`🔍 DEBUG: Scanning directory ${contentPath}`);
        
        try {
            const files = await this.manifest.getDirectoryContents(contentPath);
            console.log(`✅ Found ${files.length} files:`, files);
            
            const analysis = this.detector.analyzeFileStructure(files);
            console.log(`📊 Analysis:`, analysis);
            
            const suggestions = this.detector.suggestMissingFiles(analysis, contentPath);
            console.log(`💡 Suggestions:`, suggestions);
            
            // Näytä cache sisältö
            this.manifest.logCacheContents();
            
        } catch (error) {
            console.error(`❌ DEBUG failed:`, error);
        }
    }
}

// Export debug function globally for console testing
window.debugTOC = async (path) => {
    const toc = new AutoTableOfContents();
    await toc.debugDirectoryContents(path);
};
