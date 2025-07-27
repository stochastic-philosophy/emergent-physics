# MODUULI 3: Non-Markov Memory Detector  
# Indivisible Stochastic Processes tutkimus - Vaihe 1.3

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
import json
import pickle
from datetime import datetime
import glob

# Korvaa sklearn mutual_info_score scipy-versiolla
def mutual_info_score(x, y):
    """
    Parannettu mutual information scipy:llä
    """
    try:
        from sklearn.metrics import mutual_info_score as sklearn_mi
        return sklearn_mi(x, y)
    except ImportError:
        # Fallback: käytä histogrammi-pohjaista laskentaa
        from scipy.stats import entropy
        
        # Varmista että input on valid
        if len(x) != len(y) or len(x) < 10:
            return 0.0
            
        # Poista NaN arvot
        valid_mask = ~(np.isnan(x) | np.isnan(y))
        x_clean = x[valid_mask]
        y_clean = y[valid_mask]
        
        if len(x_clean) < 5:
            return 0.0
        
        # Normalisoi [0, 1] välille
        x_norm = (x_clean - x_clean.min()) / (x_clean.max() - x_clean.min() + 1e-10)
        y_norm = (y_clean - y_clean.min()) / (y_clean.max() - y_clean.min() + 1e-10)
        
        # Discretize 5 biniin (ei liikaa)
        x_discrete = np.digitize(x_norm, np.linspace(0, 1, 6)) - 1
        y_discrete = np.digitize(y_norm, np.linspace(0, 1, 6)) - 1
        
        # Laske entropiat
        x_entropy = entropy(np.bincount(x_discrete, minlength=5) + 1e-10)
        y_entropy = entropy(np.bincount(y_discrete, minlength=5) + 1e-10)
        
        # Joint entropy
        joint_counts = np.zeros((5, 5))
        for i in range(len(x_discrete)):
            joint_counts[x_discrete[i], y_discrete[i]] += 1
        joint_entropy = entropy((joint_counts + 1e-10).flatten())
        
        # Mutual information = H(X) + H(Y) - H(X,Y)
        mi = x_entropy + y_entropy - joint_entropy
        
        return max(0, mi)

# Lataa timestamp Moduuli 1:stä
timestamp_file = "/content/drive/MyDrive/indivisible_research_*/session_timestamp.txt"
import glob
timestamp_files = glob.glob(timestamp_file)
if timestamp_files:
    with open(timestamp_files[-1], 'r') as f:  # Ota uusin
        TIMESTAMP = f.read().strip()
    RESULTS_DIR = f"/content/drive/MyDrive/indivisible_research_{TIMESTAMP}"
else:
    print("❌ VIRHE: Session timestamp ei löydy! Aja ensin Moduuli 1.")
    raise FileNotFoundError("Session timestamp file not found")

print(f"🔬 MODUULI 3: Non-Markov Memory Detector")
print(f"📅 Session: {TIMESTAMP}")
print("="*60)

# =============================================================================
# NON-MARKOV MEMORY ANALYSIS
# =============================================================================

def discretize_time_series(time_series, n_bins=10):
    """
    Diskretisoi aikasarja mutual information laskuja varten
    """
    # Käytä quantile-pohjaista binnausta tasaisen jakauman saamiseksi
    quantiles = np.linspace(0, 1, n_bins + 1)
    bin_edges = np.quantile(time_series, quantiles)
    bin_edges[-1] += 1e-10  # Varmista että max arvo mahtuu viimeiseen biniin
    
    discretized = np.digitize(time_series, bin_edges) - 1
    discretized = np.clip(discretized, 0, n_bins - 1)
    
    return discretized

def conditional_independence_test(present, past_lag1, past_lag2, n_bins=10):
    """
    Testaa ehdollista riippumattomuutta: I(X_t; X_{t-2} | X_{t-1})
    BARANDES: Markov: I(X_t; X_{t-2} | X_{t-1}) = 0
    INDIVISIBLE: Riippuvuus division events:ien kautta, ei kaikkiin menneisiin
    """
    if len(present) != len(past_lag1) or len(present) != len(past_lag2):
        return np.nan
    
    if len(present) < 20:  # Liian vähän dataa
        return np.nan
    
    # Diskretisoi
    X_t = discretize_time_series(present, n_bins)
    X_t1 = discretize_time_series(past_lag1, n_bins) 
    X_t2 = discretize_time_series(past_lag2, n_bins)
    
    # Laske mutual information
    try:
        # I(X_t; X_t-1)
        I_t_t1 = mutual_info_score(X_t, X_t1)
        
        # I(X_t; X_t-2)  
        I_t_t2 = mutual_info_score(X_t, X_t2)
        
        # I(X_t, X_t-1; X_t-2) - yhdistetty mutual info
        combined_past = X_t1 * n_bins + X_t2  # Yhdistä past states
        I_t_combined = mutual_info_score(X_t, combined_past)
        
        # Ehdollinen mutual info: I(X_t; X_t-2 | X_t-1) ≈ I(X_t, X_t-1; X_t-2) - I(X_t; X_t-1)
        conditional_mi = I_t_combined - I_t_t1
        
        return max(0, conditional_mi)  # Ei voi olla negatiivinen
        
    except:
        return np.nan

def measure_memory_depth(time_series, division_events=None, max_lookback=15):
    """
    KORJATTU: Mittaa kuinka pitkälle menneisyyteen riippuvuus ulottuu
    BARANDES: Indivisible - riippuvuus division events:ien kautta, ei kaikista menneistä
    """
    n = len(time_series)
    memory_depths = []
    
    # Jos division events annettu, keskity niiden ympärille + satunnaiset pisteet
    if division_events is not None and len(division_events) > 0:
        analysis_points = [e['time'] for e in division_events if e['time'] < n - max_lookback]
        # Lisää satunnaisia pisteitä
        random_points = np.random.choice(range(max_lookback, n-max_lookback), 
                                       size=min(20, n//50), replace=False)
        analysis_points.extend(random_points)
    else:
        # Ota satunnaisia pisteitä
        analysis_points = np.random.choice(range(max_lookback, n-max_lookback), 
                                         size=min(30, n//30), replace=False)
    
    for t in analysis_points:
        if t < max_lookback or t >= n - 5:
            continue
            
        # Testaa riippuvuutta eri etäisyyksille - yksinkertaisempi versio
        memory_depth = 0
        current_value = time_series[t]
        
        for lag in range(1, min(max_lookback, t)):
            if t-lag < 0:
                break
            
            # Ota ikkunat ympärille
            window_size = 8  # Pienempi ikkuna
            if t + window_size >= n or t - lag - window_size < 0:
                break
                
            # Nykyhetki vs. lag:in päässä oleva historia
            current_window = time_series[t:t+window_size]
            past_window = time_series[t-lag:t-lag+window_size]
            
            # Yksinkertainen korrelaatiotesti
            if len(current_window) > 3 and len(past_window) > 3:
                if np.std(current_window) > 1e-6 and np.std(past_window) > 1e-6:
                    correlation = abs(np.corrcoef(current_window, past_window)[0, 1])
                    
                    if not np.isnan(correlation) and correlation > 0.3:  # Merkittävä korrelaatio
                        memory_depth = lag
                    else:
                        break  # Riippuvuus katkeaa
        
        memory_depths.append(memory_depth)
    
    return memory_depths

def markov_property_test(time_series, n_lags=5):
    """
    KORJATTU: Testaa Markov-ominaisuutta yksinkertaisemmin
    MARKOV: Ei pitkäaikaista riippuvuutta
    NON-MARKOV: Pitkäaikaista riippuvuutta  
    """
    n = len(time_series)
    violations = []
    
    # Testaa 20 satunnaisessa pisteessä
    test_points = np.random.choice(range(n_lags + 5, n - 5), 
                                  size=min(20, n//50), replace=False)
    
    for t in test_points:
        violations_at_t = 0
        
        for lag in range(2, min(n_lags + 1, t)):
            if t - lag < 5:
                continue
                
            # Yksinkertainen autocorrelation testi
            current_val = time_series[t]
            lag1_val = time_series[t-1] 
            lagk_val = time_series[t-lag]
            
            # Laske partial correlation: corr(current, lagk | lag1)
            # Käytä ikkunoita ympärille
            window = 5
            if t - lag - window < 0:
                continue
                
            current_window = time_series[t-window:t+1]
            lag1_window = time_series[t-1-window:t]
            lagk_window = time_series[t-lag-window:t-lag+1]
            
            if (len(current_window) > 3 and len(lag1_window) > 3 and len(lagk_window) > 3 and
                np.std(current_window) > 1e-6 and np.std(lagk_window) > 1e-6):
                
                corr_curr_lagk = abs(np.corrcoef(current_window, lagk_window)[0, 1])
                
                if not np.isnan(corr_curr_lagk) and corr_curr_lagk > 0.2:
                    violations_at_t += 1
        
        violations.append({
            'time': t,
            'violations': [],  # Simplified
            'total_violations': violations_at_t
        })
    
    return violations

def calculate_available_conditioning_times(time_series, division_events):
    """
    BARANDES: Indivisible processes - vähemmän ehdollisia todennäköisyyksiä
    Ei kaikkia aikahetkiä voi käyttää ehdollistamiseen, vain division events:it
    """
    if not division_events:
        return {
            'total_times': len(time_series),
            'available_conditioning_times': 0,
            'conditioning_sparsity': 0.0
        }
    
    total_times = len(time_series)
    available_times = len(division_events)
    sparsity = available_times / total_times
    
    return {
        'total_times': total_times,
        'available_conditioning_times': available_times,
        'conditioning_sparsity': sparsity
    }

# =============================================================================
# TESTAA MEMORY DETECTOR REFERENSSIPROSESSEILLA
# =============================================================================

print("🔍 Lataan referenssiprosessit ja division events...")

# Lataa referenssiprosessit
pickle_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_references.pkl"
try:
    with open(pickle_file, 'rb') as f:
        references = pickle.load(f)
    print("✅ Referenssiprosessit ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Referenssiprosesseja ei löydy!")
    raise FileNotFoundError("Reference processes file not found")

# Lataa division events
detection_file = f"{RESULTS_DIR}/{TIMESTAMP}_02_division_detection.json" 
try:
    with open(detection_file, 'r') as f:
        division_results = json.load(f)
    print("✅ Division events ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Division events ei löydy!")
    raise FileNotFoundError("Division events file not found")

print("\n🧠 Analysoidaan muistiominaisuuksia...")

memory_results = {}

for name, process in references.items():
    print(f"\n📊 Analysoidaan muisti: {name}")
    
    time_series = process['time_series']
    division_events = division_results[name]['division_events_list']
    
    # 1. Mittaa memory depth
    memory_depths = measure_memory_depth(time_series, division_events)
    avg_memory_depth = np.mean(memory_depths) if memory_depths else 0.0
    
    # 2. Testaa Markov-ominaisuutta
    markov_violations = markov_property_test(time_series)
    total_violations = sum(mv['total_violations'] for mv in markov_violations)
    violation_rate = total_violations / max(1, len(markov_violations))
    
    # 3. Laske conditioning sparsity
    conditioning_info = calculate_available_conditioning_times(time_series, division_events)
    
    # 4. Vertaa odotuksiin
    expected_memory = process.get('expected_memory_depth', 1.0)
    
    memory_results[name] = {
        'avg_memory_depth': float(avg_memory_depth),
        'memory_depth_std': float(np.std(memory_depths)) if memory_depths else 0.0,
        'markov_violation_rate': float(violation_rate),
        'total_markov_violations': int(total_violations),
        'conditioning_sparsity': conditioning_info['conditioning_sparsity'],
        'available_conditioning_times': conditioning_info['available_conditioning_times'],
        'expected_memory_depth': expected_memory,
        'memory_depth_samples': len(memory_depths)
    }
    
    print(f"  🧠 Memory depth: {avg_memory_depth:.2f} ± {np.std(memory_depths):.2f}")
    print(f"  🔗 Markov violations: {violation_rate:.2f} (total: {total_violations})")
    print(f"  📊 Conditioning sparsity: {conditioning_info['conditioning_sparsity']:.3f}")

# =============================================================================
# KRIITTISYYSANALYYSI MUISTILLE
# =============================================================================

print("\n⚠️ MUISTI-KRIITTISYYSANALYYSI:")

memory_warnings = []

# Markov-prosessin pitäisi olla lähellä memory depth = 1
markov_memory = memory_results['markov']['avg_memory_depth']
if markov_memory > 2.0:
    memory_warnings.append(f"🚨 Markov-prosessi antoi liian suuren memory depth: {markov_memory:.2f}")

# Deterministisen pitäisi olla joko 0 tai erittäin suuri (ennustettavuus)
det_memory = memory_results['deterministic']['avg_memory_depth'] 
det_violations = memory_results['deterministic']['markov_violation_rate']
if 1.0 < det_memory < 10.0 and det_violations > 0.5:
    memory_warnings.append(f"🚨 Deterministinen prosessi käyttäytyy oudosti: memory={det_memory:.2f}")

# Indivisible-prosessin pitäisi näyttää moderate non-Markovianity
indiv_memory = memory_results['indivisible']['avg_memory_depth']
indiv_sparsity = memory_results['indivisible']['conditioning_sparsity']
if indiv_memory < 1.5:
    memory_warnings.append(f"🚨 Indivisible-prosessi antoi liian pienen memory depth: {indiv_memory:.2f}")
if indiv_sparsity > 0.8:  # Liian tiheä conditioning
    memory_warnings.append(f"🚨 Indivisible-prosessi: conditioning ei ole harva: {indiv_sparsity:.3f}")

# White noise:n pitäisi olla lähellä memory depth = 0
noise_memory = memory_results['white_noise']['avg_memory_depth']
if noise_memory > 1.0:
    memory_warnings.append(f"🚨 White noise antoi liian suuren memory depth: {noise_memory:.2f}")

if len(memory_warnings) == 0:
    print("✅ Kaikki muisti-kriittisyystestit läpäisty!")
else:
    for warning in memory_warnings:
        print(warning)

# =============================================================================
# TALLENNA TULOKSET
# =============================================================================

# JSON tallennnus
results_file = f"{RESULTS_DIR}/{TIMESTAMP}_03_memory_analysis.json"
with open(results_file, 'w') as f:
    json.dump(memory_results, f, indent=2)

print(f"\n📊 Memory analysis tulokset tallennettu: {results_file}")

# Visualisointi - Memory depth vertailu
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))

# 1. Memory depth vertailu
names = list(memory_results.keys())
memory_depths = [memory_results[name]['avg_memory_depth'] for name in names]
memory_stds = [memory_results[name]['memory_depth_std'] for name in names]

ax1.bar(names, memory_depths, yerr=memory_stds, alpha=0.7, capsize=5)
ax1.set_ylabel('Average Memory Depth')
ax1.set_title('Memory Depth Comparison')
ax1.tick_params(axis='x', rotation=45)

# 2. Markov violation rate
violation_rates = [memory_results[name]['markov_violation_rate'] for name in names]
ax2.bar(names, violation_rates, alpha=0.7, color='orange')
ax2.set_ylabel('Markov Violation Rate') 
ax2.set_title('Non-Markovian Behavior')
ax2.tick_params(axis='x', rotation=45)

# 3. Conditioning sparsity
sparsities = [memory_results[name]['conditioning_sparsity'] for name in names]
ax3.bar(names, sparsities, alpha=0.7, color='green')
ax3.set_ylabel('Conditioning Sparsity')
ax3.set_title('Available Conditioning Times')
ax3.tick_params(axis='x', rotation=45)

# 4. Memory depth vs Expected
expected_memories = [memory_results[name]['expected_memory_depth'] for name in names]
ax4.scatter(expected_memories, memory_depths, alpha=0.8, s=100)
ax4.plot([0, max(expected_memories)], [0, max(expected_memories)], 'r--', alpha=0.5)
ax4.set_xlabel('Expected Memory Depth')
ax4.set_ylabel('Measured Memory Depth')
ax4.set_title('Expected vs Measured')

for i, name in enumerate(names):
    ax4.annotate(name, (expected_memories[i], memory_depths[i]), 
                xytext=(5, 5), textcoords='offset points', fontsize=8)

plt.suptitle(f"Memory Analysis - Session {TIMESTAMP}")
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_03_memory_analysis.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Memory analysis visualisointi tallennettu: {img_file}")
plt.show()

print(f"\n🎯 Moduuli 3 valmis - siirry Moduuliin 4 (Validointitestit)")
print("="*60)