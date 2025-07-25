// app/js/components/SimulationEngine.js
export class SimulationEngine {
    constructor() {
        this.activeSimulation = null;
        this.simulations = {
            'hybrid-models': () => import('../simulations/HybridModels.js'),
            'division-events': () => import('../simulations/DivisionEvents.js'),
            'quantum-emergence': () => import('../simulations/QuantumEmergence.js')
        };
    }
    
    async loadSimulation(type) {
        try {
            console.log(`🔬 Loading simulation: ${type}`);
            
            if (this.simulations[type]) {
                const module = await this.simulations[type]();
                this.activeSimulation = new module.default();
                
                // Find simulation container
                const container = document.querySelector('.simulation-container') || 
                                document.createElement('div');
                container.className = 'simulation-container';
                
                // Initialize simulation
                await this.activeSimulation.init(container);
                
                console.log(`✅ Simulation loaded: ${type}`);
            } else {
                throw new Error(`Unknown simulation type: ${type}`);
            }
            
        } catch (error) {
            console.error('Simulation loading failed:', error);
            this.renderSimulationError(type, error);
        }
    }
    
    renderSimulationError(type, error) {
        const container = document.querySelector('.simulation-container');
        if (container) {
            container.innerHTML = `
                <div class="simulation-error">
                    <h3>⚠️ Simulaatio ei latautunut</h3>
                    <p>Simulaation <code>${type}</code> lataaminen epäonnistui.</p>
                    <details>
                        <summary>Teknisiä tietoja</summary>
                        <pre>${error.message}</pre>
                    </details>
                </div>
            `;
        }
    }
}
