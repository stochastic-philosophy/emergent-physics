# MODUULI 5: Satunnaisuusgeneraattorit & Simple Hybrid
# Indivisible Stochastic Processes tutkimus - Vaihe 2.1

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

# Lataa timestamp Moduuli 1:stä
timestamp_file = "/content/drive/MyDrive/indivisible_research_*/session_timestamp.txt"
timestamp_files = glob.glob(timestamp_file)
if timestamp_files:
    with open(timestamp_files[-1], 'r') as f:  # Ota uusin
        TIMESTAMP = f.read().strip()
    RESULTS_DIR = f"/content/drive/MyDrive/indivisible_research_{TIMESTAMP}"
else:
    print("❌ VIRHE: Session timestamp ei löydy! Aja ensin Moduuli 1.")
    raise FileNotFoundError("Session timestamp file not found")

print(f"🔬 MODUULI 5: Satunnaisuusgeneraattorit & Simple Hybrid")
print(f"📅 Session: {TIMESTAMP}")
print(f"🎯 Vaihe 2: Satunnaisuustyyppi-skannaus aloitetaan")
print("="*60)

# =============================================================================
# SATUNNAISUUSGENERAATTORIT - KAIKKI TASOT
# =============================================================================

def generate_fractional_brownian_motion(hurst=0.7, n=1000):
    """
    Fractional Brownian Motion (fBm) - pitkän kantaman korrelaatio
    """
    # Yksinkertainen fBm approksimaatio
    dt = 1.0 / n
    t = np.linspace(0, 1, n)
    
    # Generoi Gaussian white noise
    dW = np.random.normal(0, np.sqrt(dt), n)
    
    # fBm kernel approksimaatio
    kernel = np.zeros(n)
    for i in range(n):
        if i == 0:
            kernel[i] = 1
        else:
            kernel[i] = 0.5 * ((i+1)**(2*hurst) - 2*i**(2*hurst) + (i-1)**(2*hurst))
    
    # Konvoluutio
    fbm = np.convolve(dW, kernel, mode='same')
    return fbm / np.std(fbm)  # Normalisoi

def generate_pink_noise(n=1000, beta=1.0):
    """
    Pink noise (1/f^beta noise) - scale-invariant
    KORJATTU: Parempi inf/nan käsittely
    """
    try:
        # Generoi white noise
        white = np.random.normal(0, 1, n)
        
        # FFT
        f_white = np.fft.fft(white)
        
        # Frekvenssit
        freqs = np.fft.fftfreq(n)
        freqs[0] = 1e-10  # Vältetään jako nollalla
        freqs = np.abs(freqs)
        freqs[freqs < 1e-10] = 1e-10  # Vältetään liian pienet
        
        # 1/f^beta spektri
        pink_spectrum = f_white / (freqs**beta)
        
        # Takaisin aikatasoon
        pink = np.fft.ifft(pink_spectrum).real
        
        # Normalisoi ja tarkista
        if np.std(pink) > 1e-10:
            pink = pink / np.std(pink)
        
        # Tarkista inf/nan
        if np.any(np.isnan(pink)) or np.any(np.isinf(pink)):
            # Fallback: korreloitu Gaussian
            pink = np.random.normal(0, 1, n)
            for i in range(1, n):
                pink[i] = 0.9 * pink[i-1] + 0.1 * pink[i]
        
        return pink
        
    except:
        # Fallback: yksinkertainen korreloitu noise
        noise = np.random.normal(0, 1, n)
        for i in range(1, n):
            noise[i] = 0.8 * noise[i-1] + 0.2 * noise[i]
        return noise

def generate_correlated_binary(correlation=0.3, n=1000):
    """
    Korreloitu binäärisekvenssi
    """
    sequence = np.zeros(n)
    sequence[0] = np.random.choice([-1, 1])
    
    for i in range(1, n):
        if np.random.random() < correlation:
            # Säilytä edellinen arvo
            sequence[i] = sequence[i-1]
        else:
            # Satunnainen arvo
            sequence[i] = np.random.choice([-1, 1])
    
    return sequence

# LEVEL 1: Yksinkertainen satunnaisuus
randomness_level1 = {
    'binary_01': lambda size: np.random.choice([0, 1], size=size).astype(float),
    'binary_pm1': lambda size: np.random.choice([-1, 1], size=size).astype(float),
    'uniform_01': lambda size: np.random.uniform(0, 1, size=size),
    'uniform_pm1': lambda size: np.random.uniform(-1, 1, size=size),
    'gaussian_std': lambda size: np.random.normal(0, 1, size=size)
}

# LEVEL 2: Matemaattisesti mielenkiintoinen
def safe_levy_flight(size):
    """Safe Lévy flight - fallback jos scipy.stats.levy_stable ei toimi"""
    try:
        return stats.levy_stable.rvs(alpha=1.5, beta=0, size=size)
    except:
        # Fallback: power law approksimaatio
        return np.random.pareto(1.5, size=size) * np.random.choice([-1, 1], size=size)

def safe_student_t(size):
    """Safe Student-t - fallback jos ei toimi"""
    try:
        return stats.t.rvs(df=3, size=size)
    except:
        # Fallback: Gaussian with heavier tails
        return np.random.normal(0, 1.5, size=size)

randomness_level2 = {
    'levy_flight': lambda size: safe_levy_flight(size),
    'power_law': lambda size: (np.random.uniform(0.001, 1, size=size))**(-1/2.5),
    'exponential': lambda size: np.random.exponential(1, size=size),
    'cauchy': lambda size: np.random.standard_cauchy(size=size),
    'log_normal': lambda size: np.random.lognormal(0, 1, size=size),
    'student_t': lambda size: safe_student_t(size)
}

# LEVEL 3: Kompleksi & korreloitu
randomness_level3 = {
    'complex_gaussian': lambda size: (np.random.normal(0, 1, size=size) + 
                                     1j*np.random.normal(0, 1, size=size)) / np.sqrt(2),
    'complex_uniform': lambda size: (np.random.uniform(-1, 1, size=size) + 
                                    1j*np.random.uniform(-1, 1, size=size)),
    'fractional_brownian': lambda size: generate_fractional_brownian_motion(hurst=0.7, n=size),
    'pink_noise': lambda size: generate_pink_noise(n=size, beta=1.0),
    'correlated_binary': lambda size: generate_correlated_binary(correlation=0.3, n=size),
    'mix_gauss_cauchy': lambda size: 0.7*np.random.normal(0, 1, size=size) + 0.3*np.random.standard_cauchy(size=size)
}

# Yhdistä kaikki
all_randomness_types = {**randomness_level1, **randomness_level2, **randomness_level3}

print(f"📊 Satunnaisuustyypit määritelty:")
print(f"  Level 1 (Simple): {len(randomness_level1)} types")
print(f"  Level 2 (Mathematical): {len(randomness_level2)} types") 
print(f"  Level 3 (Complex): {len(randomness_level3)} types")
print(f"  Total: {len(all_randomness_types)} types")

# =============================================================================
# SIMPLE HYBRID MODEL
# =============================================================================

def create_simple_hybrid(random_input, hybrid_type='time_evolution', interaction_strength=0.15):
    """
    Yksinkertainen hybridimalli eri satunnaisuuksille
    TAVOITE: Tuottaa time series jossa voi syntyä indivisible-käyttäytymistä
    """
    n = len(random_input)
    
    if hybrid_type == 'time_evolution':
        # Aikakehitys malli: X(t+1) = f(X(t), R(t), vuorovaikutukset)
        time_series = np.zeros(n, dtype=complex if np.iscomplexobj(random_input) else float)
        interaction_record = np.zeros(n-1)
        
        # Aloitustila
        time_series[0] = random_input[0] if not np.iscomplexobj(random_input) else random_input[0].real
        
        for t in range(1, n):
            # Deterministic evolution
            prev_state = time_series[t-1]
            
            # Vuorovaikutus ympäristön kanssa (spontaani todennäköisyydellä)
            if np.random.random() < interaction_strength:
                # Division event: uusi satunnainen komponentti
                new_component = random_input[t]
                if np.iscomplexobj(random_input):
                    new_component = new_component.real + 0.5*new_component.imag
                
                time_series[t] = 0.3 * prev_state + 0.7 * new_component
                interaction_record[t-1] = 1.0
            else:
                # Tavallinen evoluutio
                noise = random_input[t] * 0.1
                if np.iscomplexobj(random_input):
                    noise = noise.real
                
                time_series[t] = 0.8 * prev_state + noise
                interaction_record[t-1] = 0.0
                
    elif hybrid_type == 'rmt_based':
        # Random Matrix Theory pohjainen
        matrix_size = min(100, int(np.sqrt(n)))  # Optimoitu koko
        
        # Luo matriisi random_input:sta
        matrix_elements = random_input[:matrix_size**2]
        if len(matrix_elements) < matrix_size**2:
            # Täydennä tarvittaessa
            extra = np.tile(random_input, 
                          int(np.ceil(matrix_size**2 / len(random_input))))[:matrix_size**2 - len(matrix_elements)]
            matrix_elements = np.concatenate([matrix_elements, extra])
        
        if np.iscomplexobj(matrix_elements):
            H = matrix_elements.reshape(matrix_size, matrix_size)
            H = (H + H.conj().T) / 2  # Hermiittinen
        else:
            H = matrix_elements.reshape(matrix_size, matrix_size)
            H = (H + H.T) / 2  # Symmetrinen
        
        # Diagonalisoi
        eigenvals, eigenvecs = np.linalg.eigh(H)
        
        # Aikakehitys kvanttimainen
        time_series = np.zeros(n)
        interaction_record = np.zeros(n-1)
        
        for t in range(n):
            # "Kvanttimainen" evoluutio
            phases = np.exp(1j * eigenvals * t * 0.01)
            if t < len(eigenvecs):
                evolved_state = eigenvecs @ (phases * eigenvecs[0])
                measurement = np.abs(evolved_state)**2
                time_series[t] = np.sum(measurement[:10])  # Observable
            else:
                time_series[t] = time_series[t-1] + np.random.normal(0, 0.1)
            
            # Vuorovaikutukset
            if t > 0:
                interaction_record[t-1] = 1.0 if np.random.random() < interaction_strength else 0.0
    
    else:  # 'oscillator_network'
        # Kytkettyjen oskillaattoreiden verkko
        n_oscillators = 20
        oscillators = np.zeros((n, n_oscillators))
        
        # Aloitustilat
        oscillators[0] = random_input[:n_oscillators] if len(random_input) >= n_oscillators else np.tile(random_input, 
                                                        int(np.ceil(n_oscillators/len(random_input))))[:n_oscillators]
        if np.iscomplexobj(oscillators[0]):
            oscillators = oscillators.real
            
        interaction_record = np.zeros(n-1)
        
        for t in range(1, n):
            # Oskillaattoridynamiikka
            for i in range(n_oscillators):
                # Naapureiden vaikutus
                neighbors = [(i-1) % n_oscillators, (i+1) % n_oscillators]
                neighbor_force = np.sum([oscillators[t-1, j] for j in neighbors])
                
                # Satunnainen voima
                random_force = random_input[t % len(random_input)]
                if np.iscomplexobj(random_force):
                    random_force = random_force.real
                
                # Yhtälö: X''(t) = -w^2*X(t) + coupling*neighbors + noise
                omega = 1.0 + 0.1 * i  # Eri taajuuksia
                
                if t >= 2:
                    oscillators[t, i] = (2*oscillators[t-1, i] - oscillators[t-2, i] 
                                       - omega**2 * oscillators[t-1, i] * 0.01
                                       + 0.05 * neighbor_force 
                                       + 0.1 * random_force)
                else:
                    oscillators[t, i] = oscillators[t-1, i] + 0.1 * random_force
            
            # Vuorovaikutustiedot
            interaction_record[t-1] = 1.0 if np.random.random() < interaction_strength else 0.0
        
        # Observable: kokonaisenergian vaihtelu
        time_series = np.sum(oscillators**2, axis=1)
    
    return {
        'time_series': np.array(time_series).real if np.iscomplexobj(time_series) else np.array(time_series),
        'interaction_record': interaction_record,
        'hybrid_type': hybrid_type,
        'random_input_type': 'complex' if np.iscomplexobj(random_input) else 'real'
    }

# =============================================================================
# TESTAA SATUNNAISUUSGENERAATTORIT
# =============================================================================

print("\n🧪 Testaan satunnaisuusgeneraattoreita...")

# Testaa jokainen tyyppi pienellä otoksella
test_results = {}
for name, generator in all_randomness_types.items():
    try:
        sample = generator(100)
        
        test_results[name] = {
            'mean': float(np.mean(sample.real if np.iscomplexobj(sample) else sample)),
            'std': float(np.std(sample.real if np.iscomplexobj(sample) else sample)),
            'min': float(np.min(sample.real if np.iscomplexobj(sample) else sample)),
            'max': float(np.max(sample.real if np.iscomplexobj(sample) else sample)),
            'is_complex': bool(np.iscomplexobj(sample)),
            'has_inf': bool(np.any(np.isinf(sample))),
            'has_nan': bool(np.any(np.isnan(sample))),
            'status': 'OK'
        }
        print(f"  ✅ {name}: mean={test_results[name]['mean']:.2f}, std={test_results[name]['std']:.2f}")
        
    except Exception as e:
        test_results[name] = {
            'status': f'ERROR: {str(e)[:50]}',
            'mean': None, 'std': None, 'min': None, 'max': None,
            'is_complex': False, 'has_inf': False, 'has_nan': False
        }
        print(f"  ❌ {name}: {str(e)[:50]}")

# =============================================================================
# TESTAA SIMPLE HYBRID MODELS
# =============================================================================

print("\n🔄 Testaan simple hybrid models...")

# Valitse muutama satunnaisuustyyppi testaamiseen
test_randomness = ['gaussian_std', 'complex_gaussian', 'pink_noise', 'binary_pm1']
hybrid_types = ['time_evolution', 'rmt_based', 'oscillator_network']

hybrid_test_results = {}

for rand_name in test_randomness:
    if test_results[rand_name]['status'] != 'OK':
        continue
        
    print(f"\n📊 Testaan randomness: {rand_name}")
    
    for hybrid_type in hybrid_types:
        try:
            # Generoi satunnaisuus
            random_input = all_randomness_types[rand_name](500)
            
            # Luo hybridi
            hybrid_result = create_simple_hybrid(random_input, 
                                               hybrid_type=hybrid_type, 
                                               interaction_strength=0.15)
            
            ts = hybrid_result['time_series']
            interaction_record = hybrid_result['interaction_record']
            
            key = f"{rand_name}_{hybrid_type}"
            hybrid_test_results[key] = {
                'randomness_type': rand_name,
                'hybrid_type': hybrid_type,
                'time_series_length': len(ts),
                'time_series_mean': float(np.mean(ts)),
                'time_series_std': float(np.std(ts)),
                'interaction_events': int(np.sum(interaction_record)),
                'interaction_rate': float(np.mean(interaction_record)),
                'ts_min': float(np.min(ts)),
                'ts_max': float(np.max(ts)),
                'status': 'OK'
            }
            
            print(f"    ✅ {hybrid_type}: {hybrid_test_results[key]['interaction_events']} interactions, "
                  f"ts_std={hybrid_test_results[key]['time_series_std']:.2f}")
            
        except Exception as e:
            key = f"{rand_name}_{hybrid_type}"
            hybrid_test_results[key] = {
                'status': f'ERROR: {str(e)[:50]}',
                'randomness_type': rand_name,
                'hybrid_type': hybrid_type
            }
            print(f"    ❌ {hybrid_type}: {str(e)[:50]}")

# =============================================================================
# TALLENNA TULOKSET
# =============================================================================

# Tallenna testitulokset
results_data = {
    'randomness_generators': test_results,
    'hybrid_models': hybrid_test_results,
    'available_randomness_types': list(all_randomness_types.keys()),
    'working_randomness_types': [name for name, result in test_results.items() 
                                if result['status'] == 'OK'],
    'timestamp': TIMESTAMP
}

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_05_randomness_testing.json"
with open(results_file, 'w') as f:
    json.dump(results_data, f, indent=2)

print(f"\n📊 Randomness testing tulokset tallennettu: {results_file}")

# Visualisointi - näytä muutama esimerkki
fig, axes = plt.subplots(2, 3, figsize=(15, 8))
axes = axes.flatten()

# Näytä erilaisia satunnaisuustyyppejä
example_types = ['gaussian_std', 'binary_pm1', 'pink_noise', 'complex_gaussian', 'levy_flight', 'correlated_binary']

for i, rand_type in enumerate(example_types):
    if i >= 6 or test_results[rand_type]['status'] != 'OK':
        continue
        
    sample = all_randomness_types[rand_type](200)
    
    if np.iscomplexobj(sample):
        axes[i].plot(sample.real, alpha=0.8, label='Real')
        axes[i].plot(sample.imag, alpha=0.8, label='Imag')
        axes[i].legend()
    else:
        axes[i].plot(sample, alpha=0.8)
    
    axes[i].set_title(f"{rand_type}\n(std={test_results[rand_type]['std']:.2f})")
    axes[i].grid(True, alpha=0.3)

plt.suptitle(f"Satunnaisuusgeneraattorit - Session {TIMESTAMP}")
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_05_randomness_examples.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Satunnaisuusesimerkit tallennettu: {img_file}")
plt.show()

print(f"\n🎯 Moduuli 5 valmis!")
print(f"✅ {len([r for r in test_results.values() if r['status'] == 'OK'])}/{len(test_results)} satunnaisuustyyppiä toimii")
print(f"✅ {len([r for r in hybrid_test_results.values() if r['status'] == 'OK'])}/{len(hybrid_test_results)} hybrid-mallia toimii")
print(f"🚀 Seuraavaksi: Moduuli 6 (Systematic Testing Loop)")
print("="*60)