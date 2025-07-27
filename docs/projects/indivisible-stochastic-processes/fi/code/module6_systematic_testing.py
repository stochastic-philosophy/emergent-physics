# MODUULI 6: Systematic Testing Loop (Monte Carlo)
# Indivisible Stochastic Processes tutkimus - Vaihe 2.2

import numpy as np
import matplotlib.pyplot as plt
import json
import pickle
from datetime import datetime
import glob
from scipy import stats
from scipy.signal import find_peaks
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

print(f"🔬 MODUULI 6: Systematic Testing Loop (Monte Carlo)")
print(f"📅 Session: {TIMESTAMP}")
print(f"🎯 Vaihe 2.2: Systemaattinen satunnaisuustestaus")
print("="*60)

# =============================================================================
# LATAA VAIHE 1 FUNKTIOT JA VAIHE 2.1 GENERAATTORIT
# =============================================================================

# Kopioi tärkeimmät funktiot Vaihe 1:stä (yksinkertaistettu)
def measure_classical_correlation(time_series, interaction_record, window_size=8):
    """Yksinkertaistettu versio Moduuli 2:sta - KORJATTU"""
    n = len(time_series)
    correlations = np.zeros(n)
    
    # Varmista että inputs ovat valideja
    if n < window_size * 2 or len(interaction_record) < window_size:
        return correlations
    
    for t in range(window_size, min(n, len(interaction_record) + 1)):
        try:
            ts_window = time_series[t-window_size:t+1]
            int_window = interaction_record[max(0, t-window_size):t]
            
            # Varmista että ikkunat ovat valideja
            if len(ts_window) > 3 and len(int_window) > 3:
                if np.std(ts_window) > 1e-6 and np.std(int_window) > 1e-6:
                    # Sovita ikkunat samaan kokoon
                    min_len = min(len(ts_window)-1, len(int_window))
                    ts_trim = ts_window[:min_len]
                    int_trim = int_window[:min_len]
                    
                    if len(ts_trim) > 2 and len(int_trim) > 2:
                        correlation = abs(np.corrcoef(ts_trim, int_trim)[0, 1])
                        if not (np.isnan(correlation) or np.isinf(correlation)):
                            correlations[t] = correlation
        except:
            continue
    
    return correlations

def detect_division_events_simple(time_series, interaction_record):
    """Yksinkertaistettu division events detector - KORJATTU"""
    division_events = []
    
    # Varmista että inputs ovat valideja
    if len(time_series) < 10 or len(interaction_record) < 5:
        return division_events
    
    try:
        # Metodi 1: Korrelaatio
        correlations = measure_classical_correlation(time_series, interaction_record)
        if np.any(correlations > 0):
            correlation_events = find_peaks(correlations, height=0.2, distance=5)[0]
        else:
            correlation_events = []
    except:
        correlation_events = []
    
    try:
        # Metodi 2: Suorat vuorovaikutukset  
        interaction_events = np.where(interaction_record > 0.3)[0]
    except:
        interaction_events = []
    
    # Yhdistä (yksinkertainen)
    all_events = set(correlation_events) | set(interaction_events + 1)  # +1 for offset
    
    for t in all_events:
        if 0 < t < len(time_series):
            score = 0.5  # Yksinkertainen score
            try:
                if t-1 in range(len(interaction_record)) and interaction_record[t-1] > 0.3:
                    score += 0.4
                if t < len(correlations) and correlations[t] > 0.2:
                    score += 0.3
            except:
                pass
            
            division_events.append({
                'time': int(t),
                'score': min(1.0, score)
            })
    
    return division_events

def measure_memory_depth_simple(time_series, max_lookback=10):
    """Yksinkertaistettu memory depth mittari"""
    n = len(time_series)
    memory_depths = []
    
    # Testaa 10 satunnaisessa pisteessä
    test_points = np.random.choice(range(max_lookback, n-5), size=min(10, n//50), replace=False)
    
    for t in test_points:
        memory_depth = 0
        
        for lag in range(1, min(max_lookback, t)):
            window_size = 6
            if t + window_size >= n or t - lag - window_size < 0:
                break
                
            current_window = time_series[t:t+window_size]
            past_window = time_series[t-lag:t-lag+window_size]
            
            if len(current_window) > 3 and len(past_window) > 3:
                if np.std(current_window) > 1e-6 and np.std(past_window) > 1e-6:
                    try:
                        correlation = abs(np.corrcoef(current_window, past_window)[0, 1])
                        if not np.isnan(correlation) and correlation > 0.25:
                            memory_depth = lag
                        else:
                            break
                    except:
                        break
        
        memory_depths.append(memory_depth)
    
    return memory_depths

def calculate_indivisible_score_simple(division_rate, memory_depth, interaction_rate):
    """Yksinkertaistettu indivisible score"""
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
    
    return {
        'total_score': total_score,
        'division_component': div_comp,
        'memory_component': mem_comp,
        'interaction_component': int_comp
    }

# Lataa satunnaisuusgeneraattorit Moduuli 5:stä
print("🔍 Lataan satunnaisuusgeneraattoreita...")

# Kopioi generaattorit (yksinkertaistettu)
def generate_fbm_simple(n=1000, hurst=0.7):
    """Yksinkertainen fBm"""
    noise = np.random.normal(0, 1, n)
    # Yksinkertainen correloi naapureiden kanssa
    fbm = np.zeros(n)
    fbm[0] = noise[0]
    for i in range(1, n):
        fbm[i] = hurst * fbm[i-1] + (1-hurst) * noise[i]
    return fbm / np.std(fbm)

def generate_pink_simple(n=1000):
    """Yksinkertainen pink noise"""
    white = np.random.normal(0, 1, n)
    # Yksinkertainen 1/f approksimaatio
    pink = np.zeros(n)
    pink[0] = white[0]
    for i in range(1, n):
        pink[i] = 0.95 * pink[i-1] + 0.05 * white[i]
    return pink

randomness_generators = {
    # Level 1: Simple
    'binary_01': lambda n: np.random.choice([0, 1], size=n).astype(float),
    'binary_pm1': lambda n: np.random.choice([-1, 1], size=n).astype(float),
    'uniform_01': lambda n: np.random.uniform(0, 1, size=n),
    'uniform_pm1': lambda n: np.random.uniform(-1, 1, size=n),
    'gaussian_std': lambda n: np.random.normal(0, 1, size=n),
    
    # Level 2: Mathematical
    'exponential': lambda n: np.random.exponential(1, size=n),
    'cauchy': lambda n: np.random.standard_cauchy(size=n),
    'log_normal': lambda n: np.random.lognormal(0, 1, size=n),
    'student_t': lambda n: np.random.standard_t(3, size=n),  # Safer version
    'chi2': lambda n: np.random.chisquare(df=3, size=n),
    
    # Level 3: Complex  
    'complex_gaussian': lambda n: (np.random.normal(0, 1, n) + 1j*np.random.normal(0, 1, n)) / np.sqrt(2),
    'complex_uniform': lambda n: (np.random.uniform(-1, 1, n) + 1j*np.random.uniform(-1, 1, n)),
    'fractional_brownian': lambda n: generate_fbm_simple(n, hurst=0.7),
    'pink_noise': lambda n: generate_pink_simple(n)
}

def create_simple_hybrid_fast(random_input, interaction_strength=0.15):
    """Nopea hybridimalli Monte Carlo:a varten"""
    n = len(random_input)
    time_series = np.zeros(n)
    interaction_record = np.zeros(n-1)
    
    # Aloitus
    time_series[0] = random_input[0].real if np.iscomplexobj(random_input[0]) else random_input[0]
    
    for t in range(1, n):
        # Vuorovaikutus
        if np.random.random() < interaction_strength:
            new_comp = random_input[t]
            if np.iscomplexobj(new_comp):
                new_comp = new_comp.real + 0.3 * new_comp.imag
            time_series[t] = 0.4 * time_series[t-1] + 0.6 * new_comp
            interaction_record[t-1] = 1.0
        else:
            noise = random_input[t] * 0.1
            if np.iscomplexobj(noise):
                noise = noise.real
            time_series[t] = 0.85 * time_series[t-1] + noise
            interaction_record[t-1] = 0.0
    
    return time_series, interaction_record

# =============================================================================
# SYSTEMATIC MONTE CARLO TESTING LOOP
# =============================================================================

print("\n🔄 Aloitetaan systemaattinen Monte Carlo testaus...")

# Testausparametrit (optimoitu Google Colab:lle)
N_MONTE_CARLO = 30  # 30 toistoa per tyyppi (tasapaino aika vs tarkkuus)
TIME_SERIES_LENGTH = 800  # Lyhyempi koko (nopeus)
INTERACTION_STRENGTHS = [0.1, 0.15, 0.2]  # Testaa eri interaction vahvuuksia

# Suodata toimivat generaattorit
working_generators = {}
for name, generator in randomness_generators.items():
    try:
        test_sample = generator(100)
        if not (np.any(np.isnan(test_sample)) or np.any(np.isinf(test_sample))):
            working_generators[name] = generator
            print(f"  ✅ {name} - toimii")
        else:
            print(f"  ❌ {name} - NaN/Inf arvoja")
    except Exception as e:
        print(f"  ❌ {name} - virhe: {str(e)[:30]}")

print(f"\n🎯 Testataan {len(working_generators)} satunnaisuustyyppiä")
print(f"🔬 {N_MONTE_CARLO} Monte Carlo toistoa per tyyppi")
print(f"📏 {TIME_SERIES_LENGTH} pisteen aikasarjat")

# Pääsilmukka
systematic_results = {}
total_tests = len(working_generators) * len(INTERACTION_STRENGTHS) * N_MONTE_CARLO
test_counter = 0

for interaction_strength in INTERACTION_STRENGTHS:
    print(f"\n🔗 Interaction strength: {interaction_strength}")
    
    for rand_name, rand_generator in working_generators.items():
        print(f"  📊 Testaan: {rand_name}...", end=" ")
        
        # Monte Carlo toistot
        trial_results = []
        
        for trial in range(N_MONTE_CARLO):
            test_counter += 1
            
            try:
                # 1. Generoi satunnaisuus
                random_input = rand_generator(TIME_SERIES_LENGTH)
                
                # 2. Luo hybridi
                time_series, interaction_record = create_simple_hybrid_fast(
                    random_input, interaction_strength
                )
                
                # 3. Analysoi indivisible ominaisuudet
                division_events = detect_division_events_simple(time_series, interaction_record)
                memory_depths = measure_memory_depth_simple(time_series)
                
                # 4. Laske mittarit
                division_rate = len(division_events) / len(time_series)
                avg_memory_depth = np.mean(memory_depths) if memory_depths else 0.0
                interaction_rate = np.mean(interaction_record)
                
                # 5. Indivisible score
                score_result = calculate_indivisible_score_simple(
                    division_rate, avg_memory_depth, interaction_rate
                )
                
                trial_results.append({
                    'division_rate': division_rate,
                    'memory_depth': avg_memory_depth,
                    'interaction_rate': interaction_rate,
                    'indivisible_score': score_result['total_score'],
                    'score_components': {
                        'division': score_result['division_component'],
                        'memory': score_result['memory_component'],
                        'interaction': score_result['interaction_component']
                    }
                })
                
            except Exception as e:
                trial_results.append({
                    'error': str(e)[:50],
                    'division_rate': 0, 'memory_depth': 0, 'interaction_rate': 0,
                    'indivisible_score': 0, 'score_components': {'division': 0, 'memory': 0, 'interaction': 0}
                })
        
        # Laske tilastot Monte Carlo tuloksille
        successful_trials = [t for t in trial_results if 'error' not in t]
        
        if successful_trials:
            systematic_results[f"{rand_name}_int{interaction_strength}"] = {
                'randomness_type': rand_name,
                'interaction_strength': interaction_strength,
                'n_successful_trials': len(successful_trials),
                'n_total_trials': N_MONTE_CARLO,
                'success_rate': len(successful_trials) / N_MONTE_CARLO,
                
                # Keskiarvot
                'avg_division_rate': np.mean([t['division_rate'] for t in successful_trials]),
                'avg_memory_depth': np.mean([t['memory_depth'] for t in successful_trials]),
                'avg_interaction_rate': np.mean([t['interaction_rate'] for t in successful_trials]),
                'avg_indivisible_score': np.mean([t['indivisible_score'] for t in successful_trials]),
                
                # Keskihajonnat
                'std_division_rate': np.std([t['division_rate'] for t in successful_trials]),
                'std_memory_depth': np.std([t['memory_depth'] for t in successful_trials]),
                'std_interaction_rate': np.std([t['interaction_rate'] for t in successful_trials]),
                'std_indivisible_score': np.std([t['indivisible_score'] for t in successful_trials]),
                
                # Score komponentit
                'avg_score_components': {
                    'division': np.mean([t['score_components']['division'] for t in successful_trials]),
                    'memory': np.mean([t['score_components']['memory'] for t in successful_trials]),
                    'interaction': np.mean([t['score_components']['interaction'] for t in successful_trials])
                }
            }
            
            score = systematic_results[f"{rand_name}_int{interaction_strength}"]['avg_indivisible_score']
            print(f"Score: {score:.3f} ({len(successful_trials)}/{N_MONTE_CARLO} trials)")
        else:
            print("FAILED")
        
        # Progress
        if test_counter % 10 == 0:
            progress = test_counter / total_tests * 100
            print(f"    📈 Progress: {progress:.1f}%")

# =============================================================================
# TALLENNA TULOKSET
# =============================================================================

print(f"\n💾 Tallennetaan tulokset...")

# Kompakti tallennus
results_data = {
    'systematic_results': systematic_results,
    'test_parameters': {
        'n_monte_carlo': N_MONTE_CARLO,
        'time_series_length': TIME_SERIES_LENGTH,
        'interaction_strengths': INTERACTION_STRENGTHS,
        'n_randomness_types': len(working_generators),
        'total_tests_run': test_counter
    },
    'timestamp': TIMESTAMP
}

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_06_systematic_testing.json"
with open(results_file, 'w') as f:
    json.dump(results_data, f, indent=2)

print(f"📊 Systematic testing tulokset tallennettu: {results_file}")

# Pikayhteenveto parhaista
print(f"\n🏆 TOP 5 INDIVISIBLE SCORES:")
all_scores = [(key, result['avg_indivisible_score']) 
              for key, result in systematic_results.items()]
all_scores.sort(key=lambda x: x[1], reverse=True)

for i, (key, score) in enumerate(all_scores[:5]):
    rand_type = systematic_results[key]['randomness_type']
    interaction = systematic_results[key]['interaction_strength']
    print(f"  {i+1}. {rand_type} (int={interaction}): {score:.3f}")

print(f"\n🎯 Moduuli 6 valmis!")
print(f"✅ {len(systematic_results)} testikombinaaciota suoritettu")
print(f"🚀 Seuraavaksi: Moduuli 7 (Tulosten analyysi ja ranking)")
print("="*60)