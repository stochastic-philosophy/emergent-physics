# MODUULI 8: Advanced Hybrid Models
# Indivisible Stochastic Processes tutkimus - Vaihe 3.1

import numpy as np
import matplotlib.pyplot as plt
import json
import pickle
from datetime import datetime
import glob
from scipy import stats
from scipy.linalg import expm
import warnings
warnings.filterwarnings('ignore')

# NetworkX korvattu yksinkertaisemmalla implementaatiolla

# Lataa timestamp
timestamp_file = "/content/drive/MyDrive/indivisible_research_*/session_timestamp.txt"
timestamp_files = glob.glob(timestamp_file)
if timestamp_files:
    with open(timestamp_files[-1], 'r') as f:
        TIMESTAMP = f.read().strip()
    RESULTS_DIR = f"/content/drive/MyDrive/indivisible_research_{TIMESTAMP}"
else:
    print("❌ VIRHE: Session timestamp ei löydy!")
    raise FileNotFoundError("Session timestamp file not found")

print(f"🔬 MODUULI 8: Advanced Hybrid Models")
print(f"📅 Session: {TIMESTAMP}")
print(f"🎯 Vaihe 3.1: Kehittyneet hybridimallit parhaimmilla satunnaisuustyypeillä")
print("="*60)

# Lataa Vaihe 2 optimaaliset parametrit
print("🔍 Lataan Vaihe 2 optimaalisia parametreja...")

phase2_file = f"{RESULTS_DIR}/{TIMESTAMP}_07_phase2_final.json"
try:
    with open(phase2_file, 'r') as f:
        phase2_results = json.load(f)
    
    # Parhaat parametrit
    OPTIMAL_RANDOMNESS = phase2_results['phase2_summary']['best_randomness_type']
    OPTIMAL_INTERACTION = phase2_results['phase2_summary']['optimal_interaction_strength']
    TOP_RANDOMNESS_TYPES = phase2_results['phase3_recommendations']['top_randomness_types']
    
    print(f"✅ Optimaaliset parametrit ladattu:")
    print(f"  Paras satunnaisuus: {OPTIMAL_RANDOMNESS}")
    print(f"  Optimaalinen interaction: {OPTIMAL_INTERACTION}")
    print(f"  Top 3 satunnaisuudet: {TOP_RANDOMNESS_TYPES}")
    
except FileNotFoundError:
    # Fallback oletusarvot jos Vaihe 2 ei ole valmis
    print("⚠️ Vaihe 2 tuloksia ei löydy, käytetään oletusarvoja")
    OPTIMAL_RANDOMNESS = 'binary_pm1'
    OPTIMAL_INTERACTION = 0.1
    TOP_RANDOMNESS_TYPES = ['binary_pm1', 'binary_01', 'complex_gaussian']

# =============================================================================
# OPTIMAALISET SATUNNAISUUSGENERAATTORIT VAIHE 2:STA
# =============================================================================

def generate_optimal_randomness(randomness_type, size):
    """Optimaaliset satunnaisuusgeneraattorit Vaihe 2:n tulosten perusteella"""
    
    if randomness_type == 'binary_pm1':
        return np.random.choice([-1, 1], size=size).astype(float)
    elif randomness_type == 'binary_01':
        return np.random.choice([0, 1], size=size).astype(float)
    elif randomness_type == 'complex_gaussian':
        return (np.random.normal(0, 1, size) + 1j*np.random.normal(0, 1, size)) / np.sqrt(2)
    elif randomness_type == 'complex_uniform':
        return (np.random.uniform(-1, 1, size) + 1j*np.random.uniform(-1, 1, size))
    elif randomness_type == 'gaussian_std':
        return np.random.normal(0, 1, size)
    elif randomness_type == 'uniform_pm1':
        return np.random.uniform(-1, 1, size)
    else:
        # Fallback
        return np.random.choice([-1, 1], size=size).astype(float)

print(f"\n🧬 Optimaaliset satunnaisuusgeneraattorit määritelty")

# =============================================================================
# ADVANCED HYBRID MODEL 1: RMT + FRACTALS
# =============================================================================

def rmt_fractal_hybrid(randomness_type, size=1000, rmt_weight=0.6, fractal_dim=1.8, interaction_strength=None):
    """
    RMT + Fraktaali hybridimalli
    Yhdistää Random Matrix Theory:n ja fraktaaligeometrian
    """
    if interaction_strength is None:
        interaction_strength = OPTIMAL_INTERACTION
    
    # 1. Generoi optimaalinen satunnaisuus
    random_input = generate_optimal_randomness(randomness_type, size*200)  # Extra for matrix
    
    # 2. RMT komponentti
    matrix_size = min(80, int(np.sqrt(size/4)))  # Optimoitu koko
    rmt_elements = random_input[:matrix_size**2]
    
    if np.iscomplexobj(rmt_elements):
        H = rmt_elements.reshape(matrix_size, matrix_size)
        H = (H + H.conj().T) / 2  # Hermiittinen
    else:
        H = rmt_elements.reshape(matrix_size, matrix_size)
        H = (H + H.T) / 2  # Symmetrinen
    
    # Diagonalisoi
    eigenvals, eigenvecs = np.linalg.eigh(H)
    
    # 3. Fraktaali komponentti - Sierpinski-tyyppinen rakenne
    fractal_series = np.zeros(size)
    
    # Recursive fractal generation
    def generate_fractal_recursive(level, start_idx, length, amplitude):
        if level <= 0 or length < 4:
            return
        
        # Base pattern - kolmio wave
        mid = length // 3
        if start_idx + length <= size:
            pattern = amplitude * np.array([0, 1, 0.5, -1, 0])[:min(5, length)]
            end_idx = min(start_idx + len(pattern), size)
            fractal_series[start_idx:end_idx] += pattern[:end_idx-start_idx]
        
        # Recursive calls
        new_amplitude = amplitude * (0.5 + 0.3 * np.random.random())  # Stochastic scaling
        generate_fractal_recursive(level-1, start_idx, mid, new_amplitude)
        generate_fractal_recursive(level-1, start_idx + 2*mid, length-2*mid, new_amplitude)
    
    # Generoi fraktaali
    max_level = int(np.log2(size)) - 3  # Adaptive depth
    generate_fractal_recursive(max_level, 0, size, 1.0)
    
    # Normalisoi fraktaali
    if np.std(fractal_series) > 1e-10:
        fractal_series = fractal_series / np.std(fractal_series)
    
    # 4. Yhdistä RMT ja fraktaali
    time_series = np.zeros(size)
    interaction_record = np.zeros(size-1)
    
    for t in range(size):
        # RMT evoluutio
        if t < len(eigenvals):
            rmt_phase = np.exp(1j * eigenvals[t % len(eigenvals)] * t * 0.01)
            rmt_contribution = np.real(rmt_phase * eigenvecs[0, t % len(eigenvals)])
        else:
            rmt_contribution = 0.1 * np.sin(t * 0.1)  # Fallback oscillation
        
        # Fraktaali kontribuutio
        fractal_contribution = fractal_series[t]
        
        # Division event tarkistus
        if t > 0:
            division_event = np.random.random() < interaction_strength
            
            if division_event:
                # Uusi satunnainen komponentti
                new_random = random_input[(t + size) % len(random_input)]
                if np.iscomplexobj(new_random):
                    new_random = new_random.real + 0.3 * new_random.imag
                
                # Non-linear yhdistelmä division event:in aikana
                time_series[t] = (rmt_weight * rmt_contribution + 
                                (1-rmt_weight) * fractal_contribution + 
                                0.4 * new_random)
                interaction_record[t-1] = 1.0
            else:
                # Normaali evoluutio
                prev_influence = 0.7 * time_series[t-1] if t > 0 else 0
                time_series[t] = (prev_influence + 
                                rmt_weight * rmt_contribution + 
                                (1-rmt_weight) * fractal_contribution)
                interaction_record[t-1] = 0.0
        else:
            time_series[t] = rmt_weight * rmt_contribution + (1-rmt_weight) * fractal_contribution
    
    return {
        'time_series': time_series,
        'interaction_record': interaction_record,
        'model_type': 'rmt_fractal',
        'parameters': {
            'randomness_type': randomness_type,
            'rmt_weight': rmt_weight,
            'fractal_dim': fractal_dim,
            'interaction_strength': interaction_strength,
            'matrix_size': matrix_size
        }
    }

# =============================================================================
# ADVANCED HYBRID MODEL 2: PERCOLATION + RMT
# =============================================================================

def percolation_rmt_hybrid(randomness_type, size=1000, percolation_threshold=0.593, 
                          network_size=50, interaction_strength=None):
    """
    Perkolaatio + RMT hybridimalli
    Yhdistää perkolaatioverkon ja Random Matrix Theory:n
    """
    if interaction_strength is None:
        interaction_strength = OPTIMAL_INTERACTION
    
    # 1. Generoi optimaalinen satunnaisuus
    random_input = generate_optimal_randomness(randomness_type, size*3)
    
    # 2. Perkolaatioverkko
    # Luo 2D grid
    grid_size = int(np.sqrt(network_size))
    percolation_grid = np.random.random((grid_size, grid_size)) < percolation_threshold
    
    # Etsi perkolaatiopolkuja - KORJATTU tehokkaampaan versioon
    def find_percolation_paths(grid):
        """Etsi yhteyksiä verkossa - optimoitu versio"""
        paths = []
        rows, cols = grid.shape
        
        # Luo yhteysmap tehokkaasti
        for i in range(rows):
            for j in range(cols):
                if grid[i, j]:
                    # Etsi naapurit tehokkaasti
                    neighbors = []
                    for di, dj in [(-1,0), (1,0), (0,-1), (0,1)]:
                        ni, nj = i + di, j + dj
                        if 0 <= ni < rows and 0 <= nj < cols and grid[ni, nj]:
                            neighbors.append((ni, nj))
                    
                    # Tallenna vain jos on yhteyksiä tai on reunasolmu
                    if neighbors or i == 0 or i == rows-1 or j == 0 or j == cols-1:
                        paths.append(((i, j), neighbors))
        
        return paths[:network_size]  # Rajoita kokoa
    
    percolation_paths = find_percolation_paths(percolation_grid)
    
    # 3. RMT komponentti - pienempi matriisi
    matrix_size = min(30, network_size)
    rmt_elements = random_input[size:size+matrix_size**2]
    
    if np.iscomplexobj(rmt_elements):
        H_small = rmt_elements.reshape(matrix_size, matrix_size)
        H_small = (H_small + H_small.conj().T) / 2
    else:
        H_small = rmt_elements.reshape(matrix_size, matrix_size)
        H_small = (H_small + H_small.T) / 2
    
    eigenvals_small, eigenvecs_small = np.linalg.eigh(H_small)
    
    # 4. Network dynamics
    network_states = np.zeros((size, len(percolation_paths)))
    time_series = np.zeros(size)
    interaction_record = np.zeros(size-1)
    
    # Aloitustilat
    for i, (node, neighbors) in enumerate(percolation_paths):
        init_val = random_input[i % len(random_input)]
        if np.iscomplexobj(init_val):
            init_val = init_val.real
        network_states[0, i] = init_val
    
    for t in range(1, size):
        # Division event tarkistus
        division_event = np.random.random() < interaction_strength
        
        # Päivitä network states
        for i, (node, neighbors) in enumerate(percolation_paths):
            if division_event:
                # Division event: RMT vaikutus + satunnainen komponentti
                rmt_influence = 0
                if len(eigenvals_small) > 0:
                    rmt_idx = i % len(eigenvals_small)
                    rmt_influence = 0.3 * np.real(eigenvals_small[rmt_idx] * 
                                                eigenvecs_small[0, rmt_idx])
                
                new_random = random_input[(t + i) % len(random_input)]
                if np.iscomplexobj(new_random):
                    new_random = new_random.real
                
                network_states[t, i] = (0.4 * network_states[t-1, i] + 
                                      rmt_influence + 0.3 * new_random)
                
                # Set interaction record only once per timestep
                if i == 0:
                    interaction_record[t-1] = 1.0
            else:
                # Normaali perkolaatiodynamiikka
                neighbor_influence = 0
                if neighbors:
                    # Yksinkertainen naapurivaikutus
                    neighbor_influence = 0.2 * np.mean([network_states[t-1, j % len(percolation_paths)] 
                                                       for j in range(min(3, len(neighbors)))])
                
                network_states[t, i] = (0.8 * network_states[t-1, i] + 
                                       neighbor_influence)
                
                # Set interaction record only once per timestep
                if i == 0:
                    interaction_record[t-1] = 0.0
        
        # Observable: verkon kokonaisenergian vaihtelu
        time_series[t] = np.sum(network_states[t]**2)
    
    # Normalisoi
    if np.std(time_series) > 1e-10:
        time_series = (time_series - np.mean(time_series)) / np.std(time_series)
    
    return {
        'time_series': time_series,
        'interaction_record': interaction_record,
        'model_type': 'percolation_rmt',
        'parameters': {
            'randomness_type': randomness_type,
            'percolation_threshold': percolation_threshold,
            'network_size': network_size,
            'interaction_strength': interaction_strength,
            'percolation_connectivity': len(percolation_paths) / (grid_size**2)
        }
    }

# =============================================================================
# ADVANCED HYBRID MODEL 3: TRIPLE HYBRID (RMT + FRACTAL + PERCOLATION)
# =============================================================================

def triple_hybrid_model(randomness_type, size=1000, rmt_weight=0.4, fractal_weight=0.3, 
                       percolation_weight=0.3, interaction_strength=None):
    """
    Ultimate hybrid: RMT + Fraktaalit + Perkolaatio
    Yhdistää kaikki kolme lähestymistapaa
    """
    if interaction_strength is None:
        interaction_strength = OPTIMAL_INTERACTION
    
    # Normalisoi painot
    total_weight = rmt_weight + fractal_weight + percolation_weight
    rmt_weight /= total_weight
    fractal_weight /= total_weight
    percolation_weight /= total_weight
    
    # 1. Generoi optimaalinen satunnaisuus
    random_input = generate_optimal_randomness(randomness_type, size*5)
    
    # 2. RMT komponentti
    matrix_size = min(40, int(np.sqrt(size/8)))
    rmt_elements = random_input[:matrix_size**2]
    
    if np.iscomplexobj(rmt_elements):
        H = rmt_elements.reshape(matrix_size, matrix_size)
        H = (H + H.conj().T) / 2
    else:
        H = rmt_elements.reshape(matrix_size, matrix_size)
        H = (H + H.T) / 2
    
    eigenvals, eigenvecs = np.linalg.eigh(H)
    
    # 3. Fraktaali komponentti - Cantor set inspired
    fractal_pattern = np.zeros(size)
    
    # Multi-scale fractal
    scales = [size, size//3, size//9, size//27]
    amplitudes = [1.0, 0.6, 0.3, 0.1]
    
    for scale, amplitude in zip(scales, amplitudes):
        if scale > 4:
            step = max(1, size // scale)
            for i in range(0, size, step):
                if i < size:
                    fractal_pattern[i] += amplitude * np.sin(2 * np.pi * i / scale)
    
    # 4. Perkolaatio komponentti - yksinkertaistettu
    network_size = 20
    percolation_series = np.zeros(size)
    
    # Random walk perkolaatiossa
    walker_pos = 0
    for t in range(size):
        # Random step
        step_random = random_input[(t + size) % len(random_input)]
        if np.iscomplexobj(step_random):
            step_random = step_random.real
        
        # Bounded random walk
        step = 1 if step_random > 0 else -1
        walker_pos = max(0, min(network_size-1, walker_pos + step))
        
        # Perkolation contribution
        percolation_series[t] = np.sin(2 * np.pi * walker_pos / network_size)
    
    # 5. Yhdistä kaikki komponentit
    time_series = np.zeros(size)
    interaction_record = np.zeros(size-1)
    
    for t in range(size):
        # RMT kontribuutio
        if t < len(eigenvals):
            rmt_phase = np.exp(1j * eigenvals[t % len(eigenvals)] * t * 0.005)
            rmt_contribution = np.real(rmt_phase * eigenvecs[0, t % len(eigenvals)])
        else:
            rmt_contribution = 0.1 * np.cos(t * 0.1)
        
        # Fraktaali kontribuutio
        fractal_contribution = fractal_pattern[t]
        
        # Perkolaatio kontribuutio
        percolation_contribution = percolation_series[t]
        
        # Division event tarkistus
        if t > 0:
            division_event = np.random.random() < interaction_strength
            
            if division_event:
                # Division event: kaikkien komponenttien non-lineaarinen yhdistelmä
                new_random = random_input[(t + 2*size) % len(random_input)]
                if np.iscomplexobj(new_random):
                    new_random = new_random.real + 0.2 * new_random.imag
                
                # Non-linear coupling during division events
                nonlinear_coupling = (rmt_contribution * fractal_contribution + 
                                    fractal_contribution * percolation_contribution)
                
                time_series[t] = (rmt_weight * rmt_contribution +
                                fractal_weight * fractal_contribution +
                                percolation_weight * percolation_contribution +
                                0.2 * nonlinear_coupling +
                                0.3 * new_random)
                
                interaction_record[t-1] = 1.0
            else:
                # Normaali lineaarinen evoluutio
                prev_influence = 0.6 * time_series[t-1] if t > 0 else 0
                
                time_series[t] = (prev_influence +
                                0.4 * (rmt_weight * rmt_contribution +
                                     fractal_weight * fractal_contribution +
                                     percolation_weight * percolation_contribution))
                
                interaction_record[t-1] = 0.0
        else:
            # Aloitusarvo
            time_series[t] = (rmt_weight * rmt_contribution +
                            fractal_weight * fractal_contribution +
                            percolation_weight * percolation_contribution)
    
    return {
        'time_series': time_series,
        'interaction_record': interaction_record,
        'model_type': 'triple_hybrid',
        'parameters': {
            'randomness_type': randomness_type,
            'rmt_weight': rmt_weight,
            'fractal_weight': fractal_weight,
            'percolation_weight': percolation_weight,
            'interaction_strength': interaction_strength,
            'matrix_size': matrix_size,
            'network_size': network_size
        }
    }

# =============================================================================
# TESTAA ADVANCED HYBRID MODELS
# =============================================================================

print(f"\n🧪 Testaan advanced hybrid models...")

# Testaa parhaimmilla satunnaisuustyypeillä
test_models = {
    'rmt_fractal': rmt_fractal_hybrid,
    'percolation_rmt': percolation_rmt_hybrid,
    'triple_hybrid': triple_hybrid_model
}

hybrid_test_results = {}

for randomness_type in TOP_RANDOMNESS_TYPES[:2]:  # Testaa 2 parasta
    print(f"\n📊 Testaan randomness: {randomness_type}")
    
    for model_name, model_func in test_models.items():
        try:
            print(f"  🔄 {model_name}...", end=" ")
            
            # Generoi malli
            result = model_func(randomness_type, size=800)  # Colab-optimoitu koko
            
            # Testaa että output on järkevä
            ts = result['time_series']
            interactions = result['interaction_record']
            
            test_key = f"{randomness_type}_{model_name}"
            hybrid_test_results[test_key] = {
                'randomness_type': randomness_type,
                'model_type': model_name,
                'time_series_length': len(ts),
                'time_series_mean': float(np.mean(ts)),
                'time_series_std': float(np.std(ts)),
                'interaction_events': int(np.sum(interactions)),
                'interaction_rate': float(np.mean(interactions)),
                'parameters': result['parameters'],
                'ts_min': float(np.min(ts)),
                'ts_max': float(np.max(ts)),
                'has_nan': bool(np.any(np.isnan(ts))),
                'has_inf': bool(np.any(np.isinf(ts))),
                'status': 'OK'
            }
            
            print(f"✅ {hybrid_test_results[test_key]['interaction_events']} interactions, "
                  f"std={hybrid_test_results[test_key]['time_series_std']:.3f}")
            
        except Exception as e:
            test_key = f"{randomness_type}_{model_name}"
            hybrid_test_results[test_key] = {
                'status': f'ERROR: {str(e)[:50]}',
                'randomness_type': randomness_type,
                'model_type': model_name
            }
            print(f"❌ Error: {str(e)[:30]}")

# =============================================================================
# TALLENNA ADVANCED HYBRID MODELS & TESTIT
# =============================================================================

# Tallenna funktiot pickle:nä myöhempää käyttöä varten
models_data = {
    'rmt_fractal_hybrid': rmt_fractal_hybrid,
    'percolation_rmt_hybrid': percolation_rmt_hybrid, 
    'triple_hybrid_model': triple_hybrid_model,
    'generate_optimal_randomness': generate_optimal_randomness
}

models_file = f"{RESULTS_DIR}/{TIMESTAMP}_08_advanced_models.pkl"
with open(models_file, 'wb') as f:
    pickle.dump(models_data, f)

# Tallenna testitulokset JSON:na
test_results_data = {
    'hybrid_test_results': hybrid_test_results,
    'optimal_parameters': {
        'optimal_randomness': OPTIMAL_RANDOMNESS,
        'optimal_interaction': OPTIMAL_INTERACTION,
        'top_randomness_types': TOP_RANDOMNESS_TYPES
    },
    'available_models': list(test_models.keys()),
    'timestamp': TIMESTAMP
}

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_08_advanced_testing.json"
with open(results_file, 'w') as f:
    json.dump(test_results_data, f, indent=2)

print(f"\n📊 Advanced hybrid models ja testit tallennettu:")
print(f"  Models: {models_file}")
print(f"  Results: {results_file}")

# Visualisointi - näytä esimerkkejä
fig, axes = plt.subplots(2, 3, figsize=(15, 8))
axes = axes.flatten()

plot_idx = 0
for test_key, result in hybrid_test_results.items():
    if result['status'] == 'OK' and plot_idx < 6:
        # Luo malli uudelleen visualisointia varten
        randomness_type = result['randomness_type']
        model_type = result['model_type']
        
        try:
            if model_type == 'rmt_fractal':
                model_result = rmt_fractal_hybrid(randomness_type, size=200)
            elif model_type == 'percolation_rmt':
                model_result = percolation_rmt_hybrid(randomness_type, size=200)
            elif model_type == 'triple_hybrid':
                model_result = triple_hybrid_model(randomness_type, size=200)
            
            ts = model_result['time_series']
            interactions = model_result['interaction_record']
            
            # Plottaa
            axes[plot_idx].plot(ts, alpha=0.8, linewidth=1)
            
            # Merkitse interaction events
            interaction_times = np.where(interactions > 0.5)[0]
            if len(interaction_times) > 0:
                # Varmista että indeksit ovat valideja
                valid_times = interaction_times[interaction_times < len(ts)]
                if len(valid_times) > 0:
                    axes[plot_idx].scatter(valid_times, ts[valid_times], 
                                         color='red', s=20, alpha=0.7)
            
            axes[plot_idx].set_title(f"{randomness_type}\n{model_type}")
            axes[plot_idx].grid(True, alpha=0.3)
            plot_idx += 1
            
        except:
            continue

# Piilota ylimääräiset subplot:it
for i in range(plot_idx, 6):
    axes[i].set_visible(False)

plt.suptitle(f"Advanced Hybrid Models - Session {TIMESTAMP}")
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_08_advanced_models.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Advanced models visualisointi tallennettu: {img_file}")
plt.show()

print(f"\n🎯 Moduuli 8 valmis!")
print(f"✅ {len(test_models)} advanced hybrid mallia implementoitu")
print(f"✅ {len([r for r in hybrid_test_results.values() if r['status'] == 'OK'])}/{len(hybrid_test_results)} testiä onnistui")
print(f"🚀 Seuraavaksi: Moduuli 9 (Parameter Optimization)")
print("="*60)