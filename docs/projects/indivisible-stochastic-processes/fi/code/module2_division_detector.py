# MODUULI 2: Division Events Detector
# Indivisible Stochastic Processes tutkimus - Vaihe 1.2

import numpy as np
import matplotlib.pyplot as plt
from scipy import stats
from scipy.signal import find_peaks
import json
import pickle
from datetime import datetime
import glob

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

print(f"🔬 MODUULI 2: Division Events Detector")
print(f"📅 Session: {TIMESTAMP}")
print("="*60)

# =============================================================================
# DIVISION EVENTS DETECTOR
# =============================================================================

def measure_classical_correlation(time_series, interaction_record, window_size=10):
    """
    Mittaa klassista korrelaatiota järjestelmän ja ympäristön välillä
    BARANDES: Division events syntyvät kun klassinen korrelaatio muodostuu
    """
    n = len(time_series)
    correlations = np.zeros(n)
    
    for t in range(window_size, n):
        # Ota ikkuna ympärille
        ts_window = time_series[t-window_size:t+1]
        int_window = interaction_record[max(0, t-window_size):t]
        
        if len(int_window) > 1 and np.std(ts_window) > 0 and np.std(int_window) > 0:
            # Laske korrelaatio time series ja interaction record välillä
            correlation = np.corrcoef(ts_window[:-1], int_window)[0, 1]
            if not np.isnan(correlation):
                correlations[t] = abs(correlation)
    
    return correlations

def detect_division_events_method1(time_series, interaction_record, 
                                 correlation_threshold=0.2, min_distance=5):  # Alempi threshold
    """
    MENETELMÄ 1: Korrelaatio-pohjainen division events detection
    BARANDES: Division events = klassinen korrelaatio syntyy
    PÄIVITETTY: Alempi correlation threshold paremman herkkyyden saamiseksi
    """
    correlations = measure_classical_correlation(time_series, interaction_record)
    
    # Etsi korrelaatio-piikit
    peaks, _ = find_peaks(correlations, height=correlation_threshold, distance=min_distance)
    
    division_events = []
    for peak in peaks:
        division_events.append({
            'time': peak,
            'correlation_strength': correlations[peak],
            'method': 'correlation_based'
        })
    
    return division_events, correlations

def detect_division_events_method2(time_series, lookback_window=20, 
                                 change_threshold=0.5):
    """
    MENETELMÄ 2: Ehdollisen riippuvuuden muutos
    BARANDES: Division event = uusi ehdollistamisaika tulee saataville
    """
    n = len(time_series)
    division_events = []
    
    for t in range(lookback_window, n):
        # Testaa riippuvuutta edellisiin ajanhetkiin
        current_state = time_series[t]
        
        # Laske riippuvuus eri etäisyyksille
        dependencies = []
        for lag in range(1, min(lookback_window, t)):
            past_state = time_series[t-lag]
            
            # Yksinkertainen riippuvuusmittari: korrelaatio lähihistorian kanssa
            if t-lag-5 >= 0:
                recent_history = time_series[t-lag-5:t-lag+1]
                current_context = time_series[t-5:t+1]
                
                if len(recent_history) > 2 and len(current_context) > 2:
                    if np.std(recent_history) > 0 and np.std(current_context) > 0:
                        dep = abs(np.corrcoef(recent_history, current_context)[0, 1])
                        if not np.isnan(dep):
                            dependencies.append(dep)
        
        if len(dependencies) > 3:
            # Jos riippuvuusrakenne muuttuu äkillisesti = division event
            dep_change = np.std(dependencies)
            if dep_change > change_threshold:
                division_events.append({
                    'time': t,
                    'dependency_change': dep_change,
                    'method': 'dependency_change'
                })
    
    return division_events

def detect_division_events_method3(time_series, interaction_record, 
                                 interaction_threshold=0.3):  # Alempi threshold
    """
    MENETELMÄ 3: Suora interaction record analyysi
    BARANDES: Division events = vuorovaikutus ympäristön kanssa
    PÄIVITETTY: Alempi threshold + korjattu indeksointi
    """
    division_events = []
    
    # Etsi suoraan interaction_record:sta vahvoja vuorovaikutuksia
    strong_interactions = np.where(interaction_record > interaction_threshold)[0]
    
    for t in strong_interactions:
        # Varmista että t+1 on validissa rangessa
        if t + 1 < len(time_series):
            division_events.append({
                'time': t + 1,  # +1 koska interaction vaikuttaa seuraavaan askeleeseen
                'interaction_strength': float(interaction_record[t]),
                'method': 'interaction_direct'
            })
    
    return division_events

def combined_division_detector(time_series, interaction_record, 
                              method_weights={'correlation': 0.3, 'dependency': 0.2, 'interaction': 0.5}):
    """
    Yhdistetty division events detector
    Kombinoi kaikki kolme menetelmää
    PÄIVITETTY: Korkeampi paino interaction-metodille (Barandes'in mukaan tärkeä)
    """
    # Käytä kaikkia menetelmiä
    div1, correlations = detect_division_events_method1(time_series, interaction_record)
    div2 = detect_division_events_method2(time_series)
    div3 = detect_division_events_method3(time_series, interaction_record)
    
    # Kerää kaikki division events
    all_events = {}
    
    # Menetelmä 1
    for event in div1:
        t = event['time']
        if t not in all_events:
            all_events[t] = {'score': 0, 'methods': [], 'details': {}}
        all_events[t]['score'] += method_weights['correlation']
        all_events[t]['methods'].append('correlation')
        all_events[t]['details']['correlation'] = event['correlation_strength']
    
    # Menetelmä 2  
    for event in div2:
        t = event['time']
        if t not in all_events:
            all_events[t] = {'score': 0, 'methods': [], 'details': {}}
        all_events[t]['score'] += method_weights['dependency']
        all_events[t]['methods'].append('dependency')
        all_events[t]['details']['dependency'] = event['dependency_change']
    
    # Menetelmä 3
    for event in div3:
        t = event['time']
        if t not in all_events:
            all_events[t] = {'score': 0, 'methods': [], 'details': {}}
        all_events[t]['score'] += method_weights['interaction']
        all_events[t]['methods'].append('interaction')
        all_events[t]['details']['interaction'] = event['interaction_strength']
    
    # Sorttaa pistemäärän mukaan
    final_division_events = []
    for t, data in all_events.items():
        final_division_events.append({
            'time': t,
            'score': data['score'],
            'methods': data['methods'],
            'details': data['details']
        })
    
    final_division_events.sort(key=lambda x: x['score'], reverse=True)
    
    return final_division_events, correlations

# =============================================================================
# TESTAA DIVISION EVENTS DETECTOR REFERENSSIPROSESSEILLA
# =============================================================================

print("🔍 Lataan referenssiprosessit...")

# Lataa referenssiprosessit Moduuli 1:stä
pickle_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_references.pkl"
try:
    with open(pickle_file, 'rb') as f:
        references = pickle.load(f)
    print("✅ Referenssiprosessit ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Referenssiprosesseja ei löydy! Aja ensin Moduuli 1.")
    raise FileNotFoundError("Reference processes file not found")

print("\n🔍 Testaan division events detectoria...")

detection_results = {}

for name, process in references.items():
    print(f"\n📊 Analysoidaan: {name}")
    
    time_series = process['time_series']
    interaction_record = process['interaction_record']
    
    # Käytä yhdistettyä detectoria
    division_events, correlations = combined_division_detector(
        time_series, interaction_record
    )
    
    # DEBUG: Näytä metodien tulokset erikseen indivisible-prosessille
    if name == 'indivisible':
        div1, _ = detect_division_events_method1(time_series, interaction_record)
        div2 = detect_division_events_method2(time_series)
        div3 = detect_division_events_method3(time_series, interaction_record)
        print(f"    🔍 DEBUG - Method 1 (correlation): {len(div1)} events")
        print(f"    🔍 DEBUG - Method 2 (dependency): {len(div2)} events")  
        print(f"    🔍 DEBUG - Method 3 (interaction): {len(div3)} events")
        print(f"    🔍 DEBUG - Interaction events in record: {np.sum(interaction_record > 0)}")
    
    # Suodata vain vahvimmat division events - alempi kynnys indivisible-prosesseille
    if name == 'indivisible':
        strong_events = [e for e in division_events if e['score'] > 0.3]  # Alempi kynnys
    else:
        strong_events = [e for e in division_events if e['score'] > 0.5]  # Normaali kynnys
    
    detection_results[name] = {
        'total_division_events': int(len(division_events)),
        'strong_division_events': int(len(strong_events)),
        'division_rate': float(len(strong_events) / len(time_series)),
        'expected_events': int(process['expected_division_events']),
        'division_events_list': [
            {
                'time': int(e['time']),
                'score': float(e['score']),
                'methods': e['methods'],
                'details': {k: float(v) if isinstance(v, (np.integer, np.floating)) else v 
                          for k, v in e['details'].items()}
            } for e in strong_events[:10]
        ],  # Top 10, JSON-safe
        'correlations_mean': float(np.mean(correlations)),
        'correlations_max': float(np.max(correlations))
    }
    
    print(f"  🎯 Found {len(strong_events)} strong division events " 
          f"(rate: {detection_results[name]['division_rate']:.3f})")
    print(f"  📊 Expected: {process['expected_division_events']}")
    print(f"  📈 Correlation stats: mean={detection_results[name]['correlations_mean']:.3f}, "
          f"max={detection_results[name]['correlations_max']:.3f}")

# =============================================================================
# KRIITTISYYSANALYYSI
# =============================================================================

print("\n⚠️ KRIITTISYYSANALYYSI:")

warnings = []

# Testaa että Markov-prosessi antaa vähän division events:eja
markov_rate = detection_results['markov']['division_rate']
if markov_rate > 0.1:
    warnings.append(f"🚨 Markov-prosessi antoi liian monta division event:a (rate: {markov_rate:.3f})")

# Testaa että deterministinen prosessi antaa vähän division events:eja  
det_rate = detection_results['deterministic']['division_rate']
if det_rate > 0.05:
    warnings.append(f"🚨 Deterministinen prosessi antoi division events:eja (rate: {det_rate:.3f})")

# Testaa että indivisible-esimerkki antaa division events:eja
indiv_rate = detection_results['indivisible']['division_rate']
if indiv_rate < 0.05:
    warnings.append(f"🚨 Indivisible-esimerkki antoi liian vähän division events:eja (rate: {indiv_rate:.3f})")

# Testaa että white noise antaa vähän division events:eja
noise_rate = detection_results['white_noise']['division_rate']
if noise_rate > 0.08:
    warnings.append(f"🚨 White noise antoi liian monta division event:a (rate: {noise_rate:.3f})")

if len(warnings) == 0:
    print("✅ Kaikki kriittisyystestit läpäisty!")
else:
    for warning in warnings:
        print(warning)

# =============================================================================
# TALLENNA TULOKSET
# =============================================================================

# JSON tallennnus
results_file = f"{RESULTS_DIR}/{TIMESTAMP}_02_division_detection.json"
with open(results_file, 'w') as f:
    json.dump(detection_results, f, indent=2)

print(f"\n📊 Division detection tulokset tallennettu: {results_file}")

# Visualisointi
fig, axes = plt.subplots(2, 2, figsize=(15, 10))
axes = axes.flatten()

for i, (name, process) in enumerate(references.items()):
    time_series = process['time_series'][:300]  # Näytä ensimmäiset 300 askelta
    
    # Plottaa aikasarja
    axes[i].plot(time_series, alpha=0.7, color='blue', label='Time series')
    
    # Merkitse division events
    events = detection_results[name]['division_events_list']
    event_times = [e['time'] for e in events if e['time'] < 300]
    event_scores = [e['score'] for e in events if e['time'] < 300]
    
    if event_times:
        scatter = axes[i].scatter(event_times, [time_series[t] for t in event_times], 
                       c=event_scores, cmap='Reds', s=100, alpha=0.8, 
                       label=f'Division events ({len(event_times)})')
        plt.colorbar(scatter, ax=axes[i], shrink=0.8)
    
    axes[i].set_title(f"{name}\nDivision rate: {detection_results[name]['division_rate']:.3f}")
    axes[i].grid(True, alpha=0.3)
    axes[i].legend()

plt.suptitle(f"Division Events Detection - Session {TIMESTAMP}")
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_02_division_events.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Division events visualisointi tallennettu: {img_file}")
plt.show()

print(f"\n🎯 Moduuli 2 valmis - siirry Moduuliin 3 (Non-Markov Memory Detector)")
print("="*60)