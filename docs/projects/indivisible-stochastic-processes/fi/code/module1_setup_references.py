# MODUULI 1: Setup ja referenssiprosessit
# Indivisible Stochastic Processes tutkimus - Vaihe 1.1

import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime
import os
import json
from scipy import stats
from scipy.linalg import expm
import warnings
warnings.filterwarnings('ignore')

# Google Drive mount (aja vain kerran)
from google.colab import drive
drive.mount('/content/drive')

# Asetukset
np.random.seed(42)  # Toistettavuus
TIMESTAMP = datetime.now().strftime("%m%d%H%M")  # kkppttmm
RESULTS_DIR = f"/content/drive/MyDrive/indivisible_research_{TIMESTAMP}"
os.makedirs(RESULTS_DIR, exist_ok=True)

# Tallenna timestamp myöhempää käyttöä varten
timestamp_file = f"{RESULTS_DIR}/session_timestamp.txt"
with open(timestamp_file, 'w') as f:
    f.write(TIMESTAMP)
print(f"🕐 Session timestamp tallennettu: {timestamp_file}")

print(f"🔬 INDIVISIBLE STOCHASTIC PROCESSES TUTKIMUS")
print(f"📅 Session timestamp: {TIMESTAMP}")
print(f"📁 Results directory: {RESULTS_DIR}")
print(f"🕐 Session timestamp tallennettu: {timestamp_file}")
print(f"🎯 Moduuli 1: Setup ja referenssiprosessit")
print("="*60)

# =============================================================================
# REFERENSSIPROSESSIT (Barandes'in teorian mukaiset kontrollit)
# =============================================================================

def pure_markov_process(n_steps=1000, n_states=50, transition_noise=0.1):
    """
    Klassinen Markov-prosessi (negatiivinen kontrolli)
    BARANDES: Markov-prosesseissa on KAIKKI ehdolliset todennäköisyydet
    ODOTUS: Ei division events:eja, memory depth = 1
    """
    # Luo satunnainen siirtymämatriisi
    transition_matrix = np.random.rand(n_states, n_states)
    transition_matrix = transition_matrix / transition_matrix.sum(axis=1, keepdims=True)
    
    # Aloitustila
    current_state = np.random.randint(n_states)
    time_series = [current_state]
    interaction_record = []  # Ei vuorovaikutuksia
    
    for t in range(1, n_steps):
        # Puhdas Markov siirtymä
        probabilities = transition_matrix[current_state]
        next_state = np.random.choice(n_states, p=probabilities)
        
        time_series.append(next_state)
        current_state = next_state
        
        # Ei spontaaneja vuorovaikutuksia
        interaction_record.append(0.0)
    
    return {
        'time_series': np.array(time_series),
        'interaction_record': np.array(interaction_record),
        'process_type': 'pure_markov',
        'expected_division_events': 0,
        'expected_memory_depth': 1.0
    }

def perfect_deterministic(n_steps=1000, pattern_type='sine'):
    """
    Deterministinen prosessi (negatiivinen kontrolli)
    BARANDES: Deterministiset prosessit eivät tarvitse todennäköisyyksiä
    ODOTUS: Ei division events:eja, ei satunnaisuutta
    """
    t = np.linspace(0, 10*np.pi, n_steps)
    
    if pattern_type == 'sine':
        time_series = np.sin(t) + 0.5*np.sin(3*t)  # Yhdistelmäsini
    elif pattern_type == 'saw':
        time_series = 2*(t % (2*np.pi))/(2*np.pi) - 1  # Sahalaikka
    else:
        time_series = np.cos(t) * np.exp(-t/100)  # Vaimeneva kosini
    
    # Normalisoi [-1, 1] välille
    time_series = 2 * (time_series - time_series.min()) / (time_series.max() - time_series.min()) - 1
    
    return {
        'time_series': time_series,
        'interaction_record': np.zeros(n_steps-1),  # Ei vuorovaikutuksia
        'process_type': f'deterministic_{pattern_type}',
        'expected_division_events': 0,
        'expected_memory_depth': float('inf')  # Täydellinen ennustettavuus
    }

def known_indivisible_example(n_steps=1000, division_rate=0.15):
    """
    Barandes'in teorian mukainen indivisible-esimerkki
    BARANDES: Division events syntyvät vuorovaikutuksesta ympäristön kanssa
    ODOTUS: Spontaaneja division events:eja, memory depth > 1
    """
    time_series = []
    interaction_record = []
    division_times = []
    
    # Aloitustila
    current_state = np.random.normal(0, 1)
    time_series.append(current_state)
    
    for t in range(1, n_steps):
        # Spontaani division event todennäköisyydellä
        division_event = np.random.random() < division_rate
        
        if division_event:
            # Division event: klassinen korrelaatio ympäristön kanssa
            division_times.append(t)
            
            # Uusi ehdollistamisaika - ei riipu edellisestä askeleesta
            # vaan viimeisimmästä division event:stä
            if len(division_times) > 1:
                last_division = division_times[-2]
                # Riippuvuus edellisestä division event:stä, ei edellisestä askeleesta
                memory_influence = time_series[last_division] * 0.3
            else:
                memory_influence = 0
            
            # Uusi satunnainen komponentti
            new_random = np.random.normal(0, 1)
            current_state = memory_influence + new_random
            
            interaction_record.append(1.0)  # Merkitse vuorovaikutus
        else:
            # Ei division event: tavallinen kehitys viimeisimmästä tilasta
            noise = np.random.normal(0, 0.1)
            current_state = 0.9 * current_state + noise
            
            interaction_record.append(0.0)
        
        time_series.append(current_state)
    
    return {
        'time_series': np.array(time_series),
        'interaction_record': np.array(interaction_record),
        'division_times': division_times,
        'process_type': 'known_indivisible',
        'expected_division_events': len(division_times),
        'expected_memory_depth': 1.0 + len(division_times)/n_steps  # Heuristinen arvio
    }

def generate_white_noise(n_steps=1000):
    """
    Valkoinen kohina (negatiivinen kontrolli)
    ODOTUS: Ei division events:eja, ei muistia
    """
    return {
        'time_series': np.random.normal(0, 1, n_steps),
        'interaction_record': np.zeros(n_steps-1),
        'process_type': 'white_noise',
        'expected_division_events': 0,
        'expected_memory_depth': 0.0
    }

# =============================================================================
# TESTAA REFERENSSIPROSESSIT
# =============================================================================

print("🧪 Generoidaan referenssiprosessit...")

# Generoi kaikki referenssit
references = {
    'markov': pure_markov_process(n_steps=1000),
    'deterministic': perfect_deterministic(n_steps=1000, pattern_type='sine'),
    'indivisible': known_indivisible_example(n_steps=1000, division_rate=0.15),
    'white_noise': generate_white_noise(n_steps=1000)
}

# Tallennus
reference_summary = {}
for name, process in references.items():
    summary = {
        'process_type': process['process_type'],
        'time_series_length': len(process['time_series']),
        'time_series_mean': float(np.mean(process['time_series'])),
        'time_series_std': float(np.std(process['time_series'])),
        'interaction_events': int(np.sum(process['interaction_record'])),
        'expected_division_events': process['expected_division_events'],
        'expected_memory_depth': process['expected_memory_depth']
    }
    reference_summary[name] = summary
    
    print(f"✅ {name}: {summary['interaction_events']} interaction events, "
          f"mean={summary['time_series_mean']:.3f}, std={summary['time_series_std']:.3f}")

# Tallenna tulokset
results_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_reference_summary.json"
with open(results_file, 'w') as f:
    json.dump(reference_summary, f, indent=2)

print(f"\n📊 Tulokset tallennettu: {results_file}")
print(f"🎯 Moduuli 1 valmis - siirry Moduuliin 2 (Division Events Detector)")
print("="*60)

# Visualisaatio - tallennetaan kuva
fig, axes = plt.subplots(2, 2, figsize=(12, 8))
axes = axes.flatten()

for i, (name, process) in enumerate(references.items()):
    ts = process['time_series'][:200]  # Näytä vain ensimmäiset 200 askelta
    axes[i].plot(ts, alpha=0.8)
    axes[i].set_title(f"{name}\n(expected div_events: {process['expected_division_events']})")
    axes[i].grid(True, alpha=0.3)
    
    # Merkitse interaction events jos on
    if np.sum(process['interaction_record']) > 0:
        interactions = np.where(process['interaction_record'][:199] > 0)[0]
        if len(interactions) > 0:
            axes[i].scatter(interactions, ts[interactions+1], 
                          color='red', s=50, alpha=0.8, label='interactions')
            axes[i].legend()

plt.suptitle(f"Referenssiprosessit - Session {TIMESTAMP}")
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_reference_processes.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Visualisointi tallennettu: {img_file}")
plt.show()

# Tallennus Python pickle:nä myöhempää käyttöä varten
import pickle
pickle_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_references.pkl"
with open(pickle_file, 'wb') as f:
    pickle.dump(references, f)
print(f"🗃️ Reference data tallennettu: {pickle_file}")