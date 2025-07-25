export class ContentManifest {
    constructor() {
        this.cache = new Map();
        this.baseUrl = 'app/content';
        
        // GitHub repo tiedot (haetaan automaattisesti)
        this.repoOwner = 'stochastic-philosophy';
        this.repoName = 'emergent-physics';
    }
    
    async getDirectoryContents(path) {
        const cacheKey = `dir_${path}`;
        
        if (this.cache.has(cacheKey)) {
            console.log(`📦 Using cached directory: ${path}`);
            return this.cache.get(cacheKey);
        }
        
        try {
            // Yritä 1: GitHub API (toimii julkisille repoille)
            const files = await this.scanWithGitHubAPI(path);
            this.cache.set(cacheKey, files);
            return files;
            
        } catch (error) {
            console.log('📄 GitHub API failed, trying probe method...');
            
            try {
                // Yritä 2: "Probe" tekniikka - kokeile yleisiä tiedostonimiä
                const files = await this.scanWithProbeMethod(path);
                this.cache.set(cacheKey, files);
                return files;
                
            } catch (probeError) {
                console.log('🔍 Probe method failed, using predefined list...');
                
                // Yritä 3: Ennalta määritelty lista yleisimmistä tiedostoista
                const files = this.getPredefinedFileList(path);
                this.cache.set(cacheKey, files);
                return files;
            }
        }
    }
    
    async scanWithGitHubAPI(path) {
        const apiUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.baseUrl}/${path}`;
        
        console.log(`🔍 Scanning via GitHub API: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`GitHub API failed: ${response.status}`);
        }
        
        const items = await response.json();
        
        // Suodata vain .md tiedostot
        const mdFiles = items
            .filter(item => item.type === 'file' && item.name.endsWith('.md'))
            .map(item => ({
                name: item.name,
                path: item.path,
                size: item.size,
                lastModified: null, // GitHub API ei anna helposti
                downloadUrl: item.download_url
            }));
            
        console.log(`✅ Found ${mdFiles.length} files via GitHub API`);
        return mdFiles;
    }
    
    async scanWithProbeMethod(path) {
        console.log(`🔍 Probing directory: ${path}`);
        
        // Lista yleisimmistä tiedostonimistä projekteissa
        const commonNames = this.generateCommonFileNames(path);
        const foundFiles = [];
        
        // Testaa jokainen tiedosto yksitellen
        for (const fileName of commonNames) {
            try {
                const fullPath = `${this.baseUrl}/${path}/${fileName}`;
                const response = await fetch(fullPath, { method: 'HEAD' });
                
                if (response.ok) {
                    foundFiles.push({
                        name: fileName,
                        path: fullPath,
                        size: parseInt(response.headers.get('content-length') || '0'),
                        lastModified: response.headers.get('last-modified'),
                        exists: true
                    });
                    console.log(`✅ Found: ${fileName}`);
                } else {
                    console.log(`❌ Not found: ${fileName}`);
                }
            } catch (error) {
                console.log(`❌ Error checking: ${fileName}`);
            }
        }
        
        if (foundFiles.length === 0) {
            throw new Error('No files found with probe method');
        }
        
        console.log(`✅ Probe method found ${foundFiles.length} files`);
        return foundFiles;
    }
    
    generateCommonFileNames(path) {
        const pathParts = path.split('/');
        const projectName = pathParts[pathParts.length - 1]; // esim. "indivisible-stochastic"
        
        // Generoi yleisimmät tiedostonimet automaattisesti
        const commonNames = [];
        
        // 1. Projektin päätiedostot
        commonNames.push(
            `${projectName}_overview.md`,
            `${projectName.replace('-', '_')}_overview.md`,
            'overview.md',
            'readme.md',
            'index.md'
        );
        
        // 2. Jatkotutkimus
        commonNames.push(
            'research_next_steps.md',
            'research_next_steps_comprehensive.md',
            'future_research.md',
            'next_steps.md'
        );
        
        // 3. Dokumentaatio-ohjeet
        commonNames.push(
            'documentation_guidelines.md',
            'documentation_guidelines_finnish.md',
            'documentation_guidelines_english.md',
            'coding_guidelines.md',
            'guidelines.md'
        );
        
        // 4. Vaiheet (Phase 1-10)
        for (let i = 1; i <= 10; i++) {
            commonNames.push(
                `phase${i}_results.md`,
                `phase${i}_documentation.md`,
                `phase${i}_analysis.md`,
                `phase_${i}_results.md`,
                `phase_${i}_documentation.md`,
                `vaihe${i}_tulokset.md`,
                `vaihe${i}_dokumentaatio.md`
            );
        }
        
        // 5. Moduulit (Module 01-20)
        for (let i = 1; i <= 20; i++) {
            const num = i.toString().padStart(2, '0');
            commonNames.push(
                `module_${num}_code_docs.md`,
                `module_${num}_documentation.md`,
                `module${num}_docs.md`,
                `moduuli_${num}_koodi.md`
            );
        }
        
        // 6. Yleiset tulostiedostot
        commonNames.push(
            'results_summary.md',
            'final_results.md',
            'analysis_results.md',
            'experimental_results.md',
            'tulokset_yhteenveto.md'
        );
        
        // 7. Koodidokumentaatio
        commonNames.push(
            'code_documentation.md',
            'api_documentation.md',
            'implementation_notes.md',
            'technical_documentation.md',
            'koodi_dokumentaatio.md'
        );
        
        console.log(`🎯 Generated ${commonNames.length} probe targets for ${path}`);
        return [...new Set(commonNames)]; // Poista duplikaatit
    }
    
    getPredefinedFileList(path) {
        // Viimeinen fallback - kovakoodatut listat tunnetuille projekteille
        const predefinedLists = {
            'fi/projects/indivisible-stochastic': [
                'indivisible_stochastic_overview.md',
                'research_next_steps_comprehensive.md',
                'documentation_guidelines_finnish.md',
                'phase1_validation_results.md',
                'phase2_randomness_analysis_results.md',
                'phase3_hybrid_models_results.md',
                'phase1_validation_documentation.md',
                'phase2_randomness_documentation.md',
                'phase3_hybrid_models_documentation.md',
                'module_01_setup_code_docs.md',
                'module_02_division_detector_code_docs.md',
                'module_03_memory_detector_code_docs.md'
            ],
            'en/projects/indivisible-stochastic': [
                'indivisible_stochastic_overview.md',
                'research_next_steps_comprehensive.md',
                'documentation_guidelines_english.md',
                'phase1_validation_results.md',
                'phase2_randomness_analysis_results.md',
                'phase3_hybrid_models_results.md'
            ]
        };
        
        const files = predefinedLists[path] || [];
        console.log(`📋 Using predefined list: ${files.length} files for ${path}`);
        
        return files.map(name => ({
            name,
            path: `${this.baseUrl}/${path}/${name}`,
            size: 0,
            lastModified: null,
            source: 'predefined'
        }));
    }
    
    // Apufunktio: lisää uusia tiedostoja lennossa
    async addDiscoveredFile(path, fileName) {
        const fullPath = `${this.baseUrl}/${path}/${fileName}`;
        
        try {
            const response = await fetch(fullPath, { method: 'HEAD' });
            if (response.ok) {
                const cacheKey = `dir_${path}`;
                const existingFiles = this.cache.get(cacheKey) || [];
                
                const newFile = {
                    name: fileName,
                    path: fullPath,
                    size: parseInt(response.headers.get('content-length') || '0'),
                    lastModified: response.headers.get('last-modified'),
                    discovered: true
                };
                
                // Lisää jos ei ole jo olemassa
                if (!existingFiles.find(f => f.name === fileName)) {
                    existingFiles.push(newFile);
                    this.cache.set(cacheKey, existingFiles);
                    console.log(`🆕 Discovered new file: ${fileName}`);
                }
                
                return true;
            }
        } catch (error) {
            console.log(`❌ Failed to verify discovered file: ${fileName}`);
        }
        
        return false;
    }
    
    // Debug: näytä kaikki löydetyt tiedostot
    logCacheContents() {
        console.log('📊 ContentManifest Cache Contents:');
        for (const [key, files] of this.cache.entries()) {
            console.log(`  ${key}: ${files.length} files`);
            files.forEach(file => {
                console.log(`    - ${file.name} (${file.source || 'auto'})`);
            });
        }
    }
}
