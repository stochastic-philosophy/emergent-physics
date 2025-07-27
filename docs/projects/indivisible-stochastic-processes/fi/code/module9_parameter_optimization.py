# MODUULI 9: Parameter Optimization
# Indivisible Stochastic Processes tutkimus - Vaihe 3.2

import numpy as np
import matplotlib.pyplot as plt
import json
import pickle
from datetime import datetime
import glob
from scipy import stats
from scipy.signal import find_peaks
from itertools import product
import warnings
warnings.filterwarnings('ignore')

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

print(f"🔬 MODUULI 9: Parameter Optimization")
print(f"📅 Session: {TIMESTAMP}")
print(f"🎯 Vaihe 3.2: Systemaattinen parametrioptimointsi advanced hybridimalleille")
print("="*60)

# =============================================================================
# LATAA VAIHE 1 FUNKTIOT (YKSINKERTAISTETTU)
# =============================================================================

# Kopioi tärkeimmät funktiot validointia varten
def measure_classical_correlation_fast(time_series, interaction_record, window_size=6):
    """Nopea versio correlation mittarista"""
    n = len(time_series)
    correlations = np.zeros(n)
    
    if n < window_size * 2 or len(interaction_record) < window_size:
        return correlations
    
    for t in range(window_size, min(n, len(interaction_record) + 1)):
        try:
            ts_window = time_series[t-window_size:t]
            int_window = interaction_record[max(0, t-window_size):t]
            
            min_len = min(len(ts_window), len(int_window))
            if min_len > 3:
                ts_trim = ts_window[:min_len]
                int_trim = int_window[:min_len]
                
                if np.std(ts_trim) > 1e-6 and np.std(int_trim) > 1e-6:
                    correlation = abs(np.corrcoef(ts_trim, int_trim)[0, 1])
                    if not (np.isnan(correlation) or np.isinf(correlation)):
                        correlations[t] = correlation
        except:
            continue
    
    return correlations

def detect_division_events_fast(time_series, interaction_record):
    """Nopea division events detector"""
    if len(time_series) < 10:
        return []
    
    division_events = []
    
    try:
        # Metodi 1: Korrelaatio
        correlations = measure_classical_correlation_fast(time_series, interaction_record)
        if np.any(correlations > 0):
            correlation_events = find_peaks(correlations, height=0.15, distance=3)[0]
        else:
            correlation_events = []
    except:
        correlation_events = []
    
    try:
        # Metodi 2: Suorat vuorovaikutukset
        interaction_events = np.where(interaction_record > 0.4)[0]
    except:
        interaction_events = []
    
    # Yhdistä
    all_events = set(correlation_events) | set(interaction_events + 1)
    
    for t in all_events:
        if 0 < t < len(time_series):
            score = 0.4
            try:
                if t-1 < len(interaction_record) and interaction_record[t-1] > 0.4:
                    score += 0.4
                if t < len(correlations) and correlations[t] > 0.15:
                    score += 0.3
            except:
                pass
            
            division_events.append({'time': int(t), 'score': min(1.0, score)})
    
    return division_events

def measure_memory_depth_fast(time_series, max_lookback=8):
    """Nopea memory depth mittari"""
    n = len(time_series)
    if n < max_lookback * 2:
        return [0.0]
    
    memory_depths = []
    test_points = np.random.choice(range(max_lookback, n-3), 
                                  size=min(5, n//50), replace=False)
    
    for t in test_points:
        memory_depth = 0
        
        for lag in range(1, min(max_lookback, t)):
            window_size = 4
            if t + window_size >= n or t - lag - window_size < 0:
                break
            
            try:
                current_window = time_series[t:t+window_size]
                past_window = time_series[t-lag:t-lag+window_size]
                
                if len(current_window) == len(past_window) == window_size:
                    if np.std(current_window) > 1e-6 and np.std(past_window) > 1e-6:
                        correlation = abs(np.corrcoef(current_window, past_window)[0, 1])
                        if not (np.isnan(correlation) or np.isinf(correlation)) and correlation > 0.2:
                            memory_depth = lag
                        else:
                            break
            except:
                break
        
        memory_depths.append(memory_depth)
    
    return memory_depths if memory_depths else [0.0]

def calculate_indivisible_score_fast(division_rate, memory_depth, interaction_rate):
    """Nopea indivisible score laskin"""
    # Division component (optimum 0.05-0.25)
    if division_rate < 0.01:
        div_comp = division_rate / 0.01
    elif 0.01 <= division_rate <= 0.25:
        div_comp = 0.8 + 0.2 * (1 - abs(division_rate - 0.15) / 0.15)
    else:
        div_comp = max(0, 1 - (division_rate - 0.25) / 0.25)
    
    # Memory component (optimum 1.5-4.0)
    if memory_depth < 0.5:
        mem_comp = memory_depth / 0.5
    elif 0.5 <= memory_depth <= 4.0:
        mem_comp = 0.8 + 0.2 * (1 - abs(memory_depth - 2.5) / 2.0)
    else:
        mem_comp = max(0, 1 - (memory_depth - 4.0) / 6.0)
    
    # Interaction component (optimum 0.05-0.25)
    if interaction_rate < 0.01:
        int_comp = interaction_rate / 0.01
    elif 0.01 <= interaction_rate <= 0.25:
        int_comp = 0.8 + 0.2 * (1 - abs(interaction_rate - 0.15) / 0.15)
    else:
        int_comp = max(0, 1 - (interaction_rate - 0.25) / 0.25)
    
    # Kombinoi
    total_score = 0.4 * div_comp + 0.4 * mem_comp + 0.2 * int_comp
    
    return total_score

# =============================================================================
# LATAA ADVANCED HYBRID MODELS
# =============================================================================

print("🔍 Lataan advanced hybrid models...")

models_file = f"{RESULTS_DIR}/{TIMESTAMP}_08_advanced_models.pkl"
try:
    with open(models_file, 'rb') as f:
        models_data = pickle.load(f)
    
    rmt_fractal_hybrid = models_data['rmt_fractal_hybrid']
    percolation_rmt_hybrid = models_data['percolation_rmt_hybrid']
    triple_hybrid_model = models_data['triple_hybrid_model']
    generate_optimal_randomness = models_data['generate_optimal_randomness']
    
    print("✅ Advanced hybrid models ladattu")
    
except FileNotFoundError:
    print("❌ VIRHE: Advanced hybrid models ei löydy! Aja ensin Moduuli 8.")
    raise FileNotFoundError("Advanced hybrid models not found")

# Lataa myös Phase 2 optimaaliset parametrit
phase2_file = f"{RESULTS_DIR}/{TIMESTAMP}_07_phase2_final.json"
try:
    with open(phase2_file, 'r') as f:
        phase2_results = json.load(f)
    
    OPTIMAL_RANDOMNESS = phase2_results['phase2_summary']['best_randomness_type']
    TOP_RANDOMNESS_TYPES = phase2_results['phase3_recommendations']['top_randomness_types']
    
    print(f"✅ Phase 2 parametrit: {OPTIMAL_RANDOMNESS}, {TOP_RANDOMNESS_TYPES}")
    
except FileNotFoundError:
    print("⚠️ Phase 2 tuloksia ei löydy, käytetään oletusarvoja")
    OPTIMAL_RANDOMNESS = 'binary_pm1'
    TOP_RANDOMNESS_TYPES = ['binary_pm1', 'binary_01', 'gaussian_std']

# =============================================================================
# PARAMETER OPTIMIZATION SETUP
# =============================================================================

print(f"\n🎯 Määritellään optimointihaku...")

# Parameter grids - optimoitu Google Colab:lle
PARAMETER_GRIDS = {
    'rmt_fractal': {
        'rmt_weight': [0.4, 0.6, 0.8],
        'fractal_dim': [1.5, 1.8, 2.1],
        'interaction_strength': [0.08, 0.10, 0.12]
    },
    'percolation_rmt': {
        'percolation_threshold': [0.55, 0.593, 0.65],
        'network_size': [30, 50, 70],
        'interaction_strength': [0.08, 0.10, 0.12]
    },
    'triple_hybrid': {
        'rmt_weight': [0.3, 0.4, 0.5],
        'fractal_weight': [0.2, 0.3, 0.4],  # Varmistetaan että rmt + fractal <= 0.8
        'interaction_strength': [0.08, 0.10, 0.12]
        # percolation_weight = 1 - rmt_weight - fractal_weight (min 0.2, max 0.5)
    }
}

def evaluate_hybrid_model(model_func, randomness_type, parameters, n_trials=3):
    """
    Evaluoi hybrid mallin suorituskyky annetuilla parametreilla
    KORJATTU: Vältetään model_func.__name__ käyttö
    """
    trial_scores = []
    
    for trial in range(n_trials):
        try:
            # Tunnista malli parametrien perusteella - turvallisempi tapa
            if 'fractal_weight' in parameters and 'rmt_weight' in parameters:
                # Triple hybrid model
                percolation_weight = 1.0 - parameters['rmt_weight'] - parameters['fractal_weight']
                if percolation_weight < 0.05:  # Varmista että positiivinen
                    return 0.0  # Invalid parameter combination
                
                result = model_func(
                    randomness_type,
                    size=600,  # Colab-optimoitu
                    rmt_weight=parameters['rmt_weight'],
                    fractal_weight=parameters['fractal_weight'],
                    percolation_weight=percolation_weight,
                    interaction_strength=parameters['interaction_strength']
                )
                
            elif 'fractal_dim' in parameters:
                # RMT fractal hybrid
                result = model_func(
                    randomness_type,
                    size=600,
                    rmt_weight=parameters['rmt_weight'],
                    fractal_dim=parameters['fractal_dim'],
                    interaction_strength=parameters['interaction_strength']
                )
                
            elif 'percolation_threshold' in parameters:
                # Percolation RMT hybrid
                result = model_func(
                    randomness_type,
                    size=600,
                    percolation_threshold=parameters['percolation_threshold'],
                    network_size=parameters['network_size'],
                    interaction_strength=parameters['interaction_strength']
                )
            else:
                # Fallback
                return 0.0
            
            # Analysoi tulokset
            time_series = result['time_series']
            interaction_record = result['interaction_record']
            
            # Laske indivisible score
            division_events = detect_division_events_fast(time_series, interaction_record)
            memory_depths = measure_memory_depth_fast(time_series)
            
            division_rate = len(division_events) / len(time_series)
            avg_memory_depth = np.mean(memory_depths)
            interaction_rate = np.mean(interaction_record)
            
            score = calculate_indivisible_score_fast(division_rate, avg_memory_depth, interaction_rate)
            
            # Sanity check
            if not (np.isnan(score) or np.isinf(score)) and 0 <= score <= 1:
                trial_scores.append(score)
            
        except Exception as e:
            continue  # Skip failed trials
    
    return np.mean(trial_scores) if trial_scores else 0.0

# =============================================================================
# SYSTEMAATTINEN PARAMETER OPTIMIZATION
# =============================================================================

print(f"\n🔄 Aloitetaan systemaattinen parameter optimization...")

models_to_optimize = {
    'rmt_fractal': rmt_fractal_hybrid,
    'percolation_rmt': percolation_rmt_hybrid,
    'triple_hybrid': triple_hybrid_model
}

optimization_results = {}
total_evaluations = 0

# Laske kokonais evaluaatioiden määrä
for model_name, param_grid in PARAMETER_GRIDS.items():
    param_combinations = np.prod([len(values) for values in param_grid.values()])
    total_evaluations += param_combinations * len(TOP_RANDOMNESS_TYPES[:2])  # 2 parasta randomness tyyppiä

print(f"📊 Yhteensä {total_evaluations} evaluaatiota")

eval_counter = 0

for randomness_type in TOP_RANDOMNESS_TYPES[:2]:  # 2 parasta tyyppiä
    print(f"\n🧬 Optimoidaan randomness: {randomness_type}")
    
    for model_name, model_func in models_to_optimize.items():
        print(f"  🔧 Model: {model_name}")
        
        param_grid = PARAMETER_GRIDS[model_name]
        param_names = list(param_grid.keys())
        param_values = list(param_grid.values())
        
        best_score = 0.0
        best_params = None
        model_results = []
        
        # Grid search
        for param_combination in product(*param_values):
            eval_counter += 1
            
            # Luo parameter dictionary
            params = dict(zip(param_names, param_combination))
            
            # Evaluoi
            score = evaluate_hybrid_model(model_func, randomness_type, params)
            
            model_results.append({
                'parameters': params,
                'score': score
            })
            
            if score > best_score:
                best_score = score
                best_params = params
            
            # Progress update
            if eval_counter % 5 == 0:
                progress = eval_counter / total_evaluations * 100
                print(f"    📈 Progress: {progress:.1f}% (Current best: {best_score:.3f})")
        
        # Tallenna mallin tulokset
        key = f"{randomness_type}_{model_name}"
        optimization_results[key] = {
            'randomness_type': randomness_type,
            'model_name': model_name,
            'best_score': best_score,
            'best_parameters': best_params,
            'all_results': model_results,
            'n_evaluations': len(model_results),
            'parameter_grid': param_grid
        }
        
        print(f"    ✅ Best score: {best_score:.3f} with params: {best_params}")

# =============================================================================
# ANALYYSI JA RANKING
# =============================================================================

print(f"\n📈 Analysoidaan optimointituloksia...")

# Etsi kokonaisparhaat
all_scores = [(key, result['best_score']) for key, result in optimization_results.items()]
all_scores.sort(key=lambda x: x[1], reverse=True)

print(f"\n🏆 TOP 5 OPTIMOIDUT MALLIT:")
for i, (key, score) in enumerate(all_scores[:5]):
    result = optimization_results[key]
    randomness = result['randomness_type']
    model = result['model_name']
    params = result['best_parameters']
    
    print(f"  {i+1}. {randomness} + {model}: {score:.3f}")
    print(f"     Params: {params}")

# Mallikohtainen analyysi
print(f"\n📊 MALLIKOHTAINEN ANALYYSI:")
model_best_scores = {}

for model_name in models_to_optimize.keys():
    model_scores = [result['best_score'] for key, result in optimization_results.items() 
                   if result['model_name'] == model_name]
    if model_scores:
        model_best_scores[model_name] = {
            'max_score': max(model_scores),
            'avg_score': np.mean(model_scores),
            'std_score': np.std(model_scores)
        }
        
        print(f"  {model_name}: max={model_best_scores[model_name]['max_score']:.3f}, "
              f"avg={model_best_scores[model_name]['avg_score']:.3f} ± "
              f"{model_best_scores[model_name]['std_score']:.3f}")

# Satunnaisuustyyppi analyysi
print(f"\n🧬 SATUNNAISUUSTYYPPI ANALYYSI:")
randomness_best_scores = {}

for randomness_type in TOP_RANDOMNESS_TYPES[:2]:
    randomness_scores = [result['best_score'] for key, result in optimization_results.items() 
                        if result['randomness_type'] == randomness_type]
    if randomness_scores:
        randomness_best_scores[randomness_type] = {
            'max_score': max(randomness_scores),
            'avg_score': np.mean(randomness_scores),
            'std_score': np.std(randomness_scores)
        }
        
        print(f"  {randomness_type}: max={randomness_best_scores[randomness_type]['max_score']:.3f}, "
              f"avg={randomness_best_scores[randomness_type]['avg_score']:.3f} ± "
              f"{randomness_best_scores[randomness_type]['std_score']:.3f}")

# =============================================================================
# TALLENNA OPTIMIZATION TULOKSET
# =============================================================================

optimization_summary = {
    'optimization_results': optimization_results,
    'top_5_models': [{'key': key, 'score': score} for key, score in all_scores[:5]],
    'model_analysis': model_best_scores,
    'randomness_analysis': randomness_best_scores,
    'optimization_stats': {
        'total_evaluations': eval_counter,
        'models_optimized': len(models_to_optimize),
        'randomness_types_tested': len(TOP_RANDOMNESS_TYPES[:2]),
        'best_overall_score': all_scores[0][1] if all_scores else 0.0
    },
    'timestamp': TIMESTAMP
}

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_09_parameter_optimization.json"
with open(results_file, 'w') as f:
    json.dump(optimization_summary, f, indent=2)

print(f"\n📊 Parameter optimization tulokset tallennettu: {results_file}")

# Visualisointi - parameter spaces
if len(all_scores) > 0:
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(14, 10))
    
    # 1. Top scores comparison
    top_keys = [key for key, score in all_scores[:8]]
    top_scores = [score for key, score in all_scores[:8]]
    
    colors = ['red' if 'triple' in key else 'blue' if 'rmt_fractal' in key else 'green' for key in top_keys]
    
    ax1.barh(range(len(top_keys)), top_scores, color=colors, alpha=0.7)
    ax1.set_yticks(range(len(top_keys)))
    ax1.set_yticklabels([k.replace('_', ' ') for k in top_keys], fontsize=8)
    ax1.set_xlabel('Indivisible Score')
    ax1.set_title('Top 8 Optimized Models')
    ax1.grid(True, alpha=0.3)
    
    # 2. Model type comparison
    model_names = list(model_best_scores.keys())
    model_max_scores = [model_best_scores[name]['max_score'] for name in model_names]
    model_avg_scores = [model_best_scores[name]['avg_score'] for name in model_names]
    model_stds = [model_best_scores[name]['std_score'] for name in model_names]
    
    x = np.arange(len(model_names))
    width = 0.35
    
    ax2.bar(x - width/2, model_max_scores, width, label='Max Score', alpha=0.8)
    ax2.bar(x + width/2, model_avg_scores, width, yerr=model_stds, label='Avg Score', alpha=0.8, capsize=5)
    ax2.set_xlabel('Model Type')
    ax2.set_ylabel('Indivisible Score')
    ax2.set_title('Model Performance Comparison')
    ax2.set_xticks(x)
    ax2.set_xticklabels(model_names, rotation=45)
    ax2.legend()
    ax2.grid(True, alpha=0.3)
    
    # 3. Randomness type comparison
    if len(randomness_best_scores) > 1:
        rand_names = list(randomness_best_scores.keys())
        rand_max_scores = [randomness_best_scores[name]['max_score'] for name in rand_names]
        rand_avg_scores = [randomness_best_scores[name]['avg_score'] for name in rand_names]
        rand_stds = [randomness_best_scores[name]['std_score'] for name in rand_names]
        
        x_rand = np.arange(len(rand_names))
        
        ax3.bar(x_rand - width/2, rand_max_scores, width, label='Max Score', alpha=0.8, color='orange')
        ax3.bar(x_rand + width/2, rand_avg_scores, width, yerr=rand_stds, label='Avg Score', alpha=0.8, color='lightblue', capsize=5)
        ax3.set_xlabel('Randomness Type')
        ax3.set_ylabel('Indivisible Score')
        ax3.set_title('Randomness Type Performance')
        ax3.set_xticks(x_rand)
        ax3.set_xticklabels(rand_names, rotation=45)
        ax3.legend()
        ax3.grid(True, alpha=0.3)
    else:
        ax3.text(0.5, 0.5, 'Not enough randomness\ntypes for comparison', 
                ha='center', va='center', transform=ax3.transAxes)
        ax3.set_title('Randomness Type Analysis')
    
    # 4. Parameter sensitivity (example for best model)
    if all_scores:
        best_key = all_scores[0][0]
        best_result = optimization_results[best_key]
        
        # Plot parameter vs score for best model
        param_scores = [(r['parameters'], r['score']) for r in best_result['all_results']]
        param_names = list(best_result['parameter_grid'].keys())
        
        if len(param_names) > 0:
            # Ota ensimmäinen parametri
            param_name = param_names[0]
            param_values = [params[param_name] for params, score in param_scores]
            scores = [score for params, score in param_scores]
            
            ax4.scatter(param_values, scores, alpha=0.6, s=50)
            ax4.set_xlabel(param_name)
            ax4.set_ylabel('Indivisible Score')
            ax4.set_title(f'Parameter Sensitivity\n({best_key})')
            ax4.grid(True, alpha=0.3)
        else:
            ax4.text(0.5, 0.5, 'No parameter data\navailable', 
                    ha='center', va='center', transform=ax4.transAxes)
    
    plt.suptitle(f"Parameter Optimization Results - Session {TIMESTAMP}")
    plt.tight_layout()
    
    # Tallenna kuva
    img_file = f"{RESULTS_DIR}/{TIMESTAMP}_09_parameter_optimization.png"
    plt.savefig(img_file, dpi=150, bbox_inches='tight')
    print(f"📈 Parameter optimization visualisointi tallennettu: {img_file}")
    plt.show()

print(f"\n🎯 Moduuli 9 valmis!")
print(f"✅ {eval_counter} evaluaatiota suoritettu")
print(f"🏆 Paras kokonaisscore: {all_scores[0][1]:.3f} ({all_scores[0][0]})")
print(f"🚀 Seuraavaksi: Moduuli 10 (Final Analysis & Conclusions)")
print("="*60)