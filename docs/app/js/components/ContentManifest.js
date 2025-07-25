export class ContentManifest {
    constructor() {
        this.manifestCache = new Map();
        this.baseUrl = 'app/content';
    }
    
    async getDirectoryContents(path) {
        const manifestPath = `${this.baseUrl}/${path}/manifest.json`;
        
        try {
            const manifest = await this.loadManifest(manifestPath);
            return manifest.files;
        } catch (error) {
            console.log('📄 Manifest not found, trying fallback...');
            return this.getFallbackFileList(path);
        }
    }
    
    async loadManifest(manifestPath) {
        if (this.manifestCache.has(manifestPath)) {
            return this.manifestCache.get(manifestPath);
        }
        
        const response = await fetch(manifestPath);
        if (!response.ok) {
            throw new Error(`Manifest not found: ${manifestPath}`);
        }
        
        const manifest = await response.json();
        this.manifestCache.set(manifestPath, manifest);
        return manifest;
    }
    
    getFallbackFileList(path) {
        const fallbackLists = {
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
        
        const files = fallbackLists[path] || [];
        return files.map(name => ({ 
            name, 
            path: `${path}/${name}`,
            size: 0,
            lastModified: null
        }));
    }
}
