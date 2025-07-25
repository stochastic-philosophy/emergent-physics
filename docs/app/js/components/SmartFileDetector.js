export class SmartFileDetector {
    constructor() {
        this.detectionPatterns = this.initializePatterns();
    }
    
    initializePatterns() {
        return {
            // Kategoriat ja niiden tyypilliset nimeämismallit
            overview: [
                /.*overview\.md$/i,
                /.*yleiskatsaus\.md$/i,
                /.*summary\.md$/i,
                /.*yhteenveto\.md$/i,
                /readme\.md$/i,
                /index\.md$/i
            ],
            next_steps: [
                /.*next[_\s]steps?\.md$/i,
                /.*jatko.*\.md$/i,
                /.*future.*\.md$/i,
                /.*tulevaisuus.*\.md$/i,
                /.*roadmap\.md$/i
            ],
            guidelines: [
                /.*guidelines?\.md$/i,
                /.*ohjeet?\.md$/i,
                /.*documentation.*guidelines?\.md$/i,
                /.*coding.*standards?\.md$/i,
                /.*style.*guide\.md$/i
            ],
            results: [
                /.*results?\.md$/i,
                /.*tulokset?\.md$/i,
                /.*findings?\.md$/i,
                /.*analysis.*results?\.md$/i,
                /.*experimental.*results?\.md$/i
            ],
            phase: [
                /phase\d+.*\.md$/i,
                /vaihe\d+.*\.md$/i,
                /step\d+.*\.md$/i,
                /stage\d+.*\.md$/i
            ],
            code: [
                /.*code.*docs?\.md$/i,
                /.*koodi.*\.md$/i,
                /.*implementation.*\.md$/i,
                /.*api.*docs?\.md$/i,
                /.*technical.*\.md$/i,
                /module.*\.md$/i,
                /moduuli.*\.md$/i
            ]
        };
    }
    
    // Tunnista tiedoston kategoria nimen perusteella
    detectCategory(fileName) {
        for (const [category, patterns] of Object.entries(this.detectionPatterns)) {
            if (patterns.some(pattern => pattern.test(fileName))) {
                return category;
            }
        }
        return 'code'; // Default fallback
    }
    
    // Generoi todennäköisiä tiedostonimiä projektin perusteella
    generateLikelyFileNames(projectPath, language = 'fi') {
        const pathParts = projectPath.split('/');
        const projectName = pathParts[pathParts.length - 1];
        const suggestions = [];
        
        // Projektikohtaiset päätiedostot
        const normalizedProject = projectName.replace(/[-_]/g, '_');
        suggestions.push(
            `${normalizedProject}_overview.md`,
            `${normalizedProject}_summary.md`
        );
        
        // Kielikohtaiset tiedostot
        if (language === 'fi') {
            suggestions.push(
                'tutkimuksen_yleiskatsaus.md',
                'projektin_yhteenveto.md',
                'jatkotutkimussuunnitelmat.md',
                'dokumentaatio_ohjeet.md'
            );
        } else {
            suggestions.push(
                'project_overview.md',
                'research_summary.md',
                'future_research_plans.md',
                'documentation_guidelines.md'
            );
        }
        
        // Yleiset tiedostot
        suggestions.push(
            'overview.md',
            'readme.md',
            'index.md',
            'results.md',
            'conclusions.md'
        );
        
        return [...new Set(suggestions)];
    }
    
    // Analysoi löydettyjen tiedostojen rakenne
    analyzeFileStructure(files) {
        const analysis = {
            totalFiles: files.length,
            categories: {},
            phases: [],
            modules: [],
            missingCommon: []
        };
        
        // Kategorisoi tiedostot
        files.forEach(file => {
            const category = this.detectCategory(file.name);
            analysis.categories[category] = (analysis.categories[category] || 0) + 1;
            
            // Etsi vaihenumerot
            const phaseMatch = file.name.match(/(?:phase|vaihe)[\s_]*(\d+)/i);
            if (phaseMatch) {
                analysis.phases.push(parseInt(phaseMatch[1]));
            }
            
            // Etsi moduulinumerot
            const moduleMatch = file.name.match(/(?:module|moduuli)[\s_]*(\d+)/i);
            if (moduleMatch) {
                analysis.modules.push(parseInt(moduleMatch[1]));
            }
        });
        
        // Järjestä numerot
        analysis.phases.sort((a, b) => a - b);
        analysis.modules.sort((a, b) => a - b);
        
        // Tarkista puuttuvat yleiset tiedostot
        const commonFiles = ['overview.md', 'readme.md', 'results.md'];
        const fileNames = files.map(f => f.name.toLowerCase());
        
        analysis.missingCommon = commonFiles.filter(common => 
            !fileNames.some(existing => existing.includes(common.replace('.md', '')))
        );
        
        return analysis;
    }
    
    // Ehdota puuttuvia tiedostoja
    suggestMissingFiles(analysis, projectPath) {
        const suggestions = [];
        
        // Jos ei ole overview tiedostoa
        if (analysis.categories.overview === 0) {
            suggestions.push({
                type: 'overview',
                fileName: 'overview.md',
                reason: 'Projekti tarvitsee yleiskatsaustiedoston'
            });
        }
        
        // Jos on vaiheita mutta puuttuvia
        if (analysis.phases.length > 0) {
            const maxPhase = Math.max(...analysis.phases);
            for (let i = 1; i <= maxPhase; i++) {
                if (!analysis.phases.includes(i)) {
                    suggestions.push({
                        type: 'phase',
                        fileName: `phase${i}_documentation.md`,
                        reason: `Vaihe ${i} dokumentaatio puuttuu`
                    });
                }
            }
        }
        
        // Jos ei ole tulostiedostoa
        if (analysis.categories.results === 0) {
            suggestions.push({
                type: 'results',
                fileName: 'results_summary.md',
                reason: 'Projekti tarvitsee tulosyhteenvedon'
            });
        }
        
        return suggestions;
    }
}
