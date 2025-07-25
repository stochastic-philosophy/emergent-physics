export class SmartFileDetector {
    constructor(language = 'fi') {
        this.language = language;
        this.detectionPatterns = this.initializePatterns();
        this.categories = this.initializeCategories();
    }
    
    initializePatterns() {
        return {
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
    
    initializeCategories() {
        const translations = {
            fi: {
                overview: {
                    icon: '📖',
                    title: 'Projektin Yleiskatsaus',
                    description: 'Projektin päätavoitteet ja kokonaiskuva',
                    priority: 1
                },
                next_steps: {
                    icon: '🚀',
                    title: 'Jatkotutkimussuunnitelmat',
                    description: 'Mitä tutkitaan seuraavaksi',
                    priority: 2
                },
                guidelines: {
                    icon: '📋',
                    title: 'Dokumentaatio-ohjeet',
                    description: 'Koodauksen ja dokumentoinnin standardit',
                    priority: 3
                },
                results: {
                    icon: '📊',
                    title: 'Tutkimustulokset',
                    description: 'Empiiriset löydökset ja analyysit',
                    priority: 4
                },
                phase: {
                    icon: '⚙️',
                    title: 'Vaiheen Dokumentaatio',
                    description: 'Metodien ja toteutusten kuvaukset',
                    priority: 5
                },
                code: {
                    icon: '💻',
                    title: 'Koodidokumentaatio',
                    description: 'Tekninen toteutus ja API-kuvaukset',
                    priority: 6
                }
            },
            en: {
                overview: {
                    icon: '📖',
                    title: 'Project Overview',
                    description: 'Main objectives and comprehensive view',
                    priority: 1
                },
                next_steps: {
                    icon: '🚀',
                    title: 'Future Research Plans',
                    description: 'What will be investigated next',
                    priority: 2
                },
                guidelines: {
                    icon: '📋',
                    title: 'Documentation Guidelines',
                    description: 'Coding and documentation standards',
                    priority: 3
                },
                results: {
                    icon: '📊',
                    title: 'Research Results',
                    description: 'Empirical findings and analyses',
                    priority: 4
                },
                phase: {
                    icon: '⚙️',
                    title: 'Phase Documentation',
                    description: 'Methods and implementation descriptions',
                    priority: 5
                },
                code: {
                    icon: '💻',
                    title: 'Code Documentation',
                    description: 'Technical implementation and API descriptions',
                    priority: 6
                }
            }
        };
        
        return translations[this.language] || translations.fi;
    }
    
    // Tunnista tiedoston kategoria
    detectCategory(fileName) {
        for (const [category, patterns] of Object.entries(this.detectionPatterns)) {
            if (patterns.some(pattern => pattern.test(fileName))) {
                return category;
            }
        }
        return 'code'; // Default fallback
    }
    
    // Kategorisoi ja ryhmittele tiedostot
    categorizeAndGroup(files) {
        const categorized = files.map(file => this.categorizeFile(file));
        
        // Ryhmitä kategorioittain
        const grouped = {};
        for (const item of categorized) {
            if (!grouped[item.category]) {
                grouped[item.category] = {
                    ...this.categories[item.category],
                    category: item.category,
                    files: []
                };
            }
            grouped[item.category].files.push(item);
        }
        
        // Järjestä kategoriat prioriteetin mukaan
        const sortedCategories = Object.entries(grouped)
            .sort(([,a], [,b]) => a.priority - b.priority);
        
        // Järjestä tiedostot kategorian sisällä
        for (const [, category] of sortedCategories) {
            category.files.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        }
        
        return Object.fromEntries(sortedCategories);
    }
    
    // Kategorisoi yksittäinen tiedosto
    categorizeFile(file) {
        const category = this.detectCategory(file.name);
        
        return {
            ...file,
            category,
            ...this.categories[category],
            displayName: this.generateDisplayName(file.name),
            sortKey: this.generateSortKey(file.name, this.categories[category].priority)
        };
    }
    
    // Muuta tiedostonimi ihmisluettavaksi
    generateDisplayName(fileName) {
        let name = fileName.replace(/\.md$/, '').replace(/[-_]/g, ' ');
        
        // Kapitalisoi sanat
        name = name.replace(/\b\w+/g, word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        );
        
        // Erikoistapaukset
        const specialWords = {
            'Api': 'API',
            'Rmt': 'RMT', 
            'Json': 'JSON',
            'Css': 'CSS',
            'Html': 'HTML',
            'Javascript': 'JavaScript',
            'Ai': 'AI',
            'Ml': 'ML',
            'Ui': 'UI',
            'Ux': 'UX'
        };
        
        for (const [wrong, correct] of Object.entries(specialWords)) {
            name = name.replace(new RegExp(`\\b${wrong}\\b`, 'g'), correct);
        }
        
        return name;
    }
    
    // Generoi järjestysavain
    generateSortKey(fileName, priority) {
        const numberMatch = fileName.match(/(\d+)/);
        const number = numberMatch ? parseInt(numberMatch[1], 10) : 999;
        
        return `${priority.toString().padStart(2, '0')}_${number.toString().padStart(3, '0')}_${fileName}`;
    }
    
    // Muuta kieli
    setLanguage(language) {
        this.language = language;
        this.categories = this.initializeCategories();
    }
    
    // Generoi todennäköisiä tiedostonimiä projektin perusteella
    generateLikelyFileNames(projectPath, language = this.language) {
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
                'dokumentaatio_ohjeet.md',
                'tulokset_yhteenveto.md',
                'koodi_dokumentaatio.md'
            );
        } else {
            suggestions.push(
                'project_overview.md',
                'research_summary.md',
                'future_research_plans.md',
                'documentation_guidelines.md',
                'results_summary.md',
                'code_documentation.md'
            );
        }
        
        // Yleiset tiedostot
        suggestions.push(
            'overview.md',
            'readme.md',
            'index.md',
            'results.md',
            'conclusions.md',
            'next_steps.md'
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
        if (!analysis.categories.overview) {
            suggestions.push({
                type: 'overview',
                fileName: 'overview.md',
                reason: this.language === 'fi' ? 
                    'Projekti tarvitsee yleiskatsaustiedoston' :
                    'Project needs an overview file'
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
                        reason: this.language === 'fi' ? 
                            `Vaihe ${i} dokumentaatio puuttuu` :
                            `Phase ${i} documentation missing`
                    });
                }
            }
        }
        
        // Jos ei ole tulostiedostoa
        if (!analysis.categories.results) {
            suggestions.push({
                type: 'results',
                fileName: 'results_summary.md',
                reason: this.language === 'fi' ? 
                    'Projekti tarvitsee tulosyhteenvedon' :
                    'Project needs a results summary'
            });
        }
        
        return suggestions;
    }
}
