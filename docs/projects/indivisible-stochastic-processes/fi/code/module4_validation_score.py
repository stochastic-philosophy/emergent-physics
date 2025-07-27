# MODUULI 4: Validointitestit & Indivisible Score
# Indivisible Stochastic Processes tutkimus - Vaihe 1.4

import numpy as np
import matplotlib.pyplot as plt
import json
import pickle
from datetime import datetime
import pandas as pd
import glob

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

print(f"🔬 MODUULI 4: Validointitestit & Indivisible Score")
print(f"📅 Session: {TIMESTAMP}")
print("="*60)

# =============================================================================
# INDIVISIBLE SCORE CALCULATION
# =============================================================================

def calculate_indivisible_score(division_rate, memory_depth, conditioning_sparsity, 
                               markov_violation_rate, process_type='unknown'):
    """
    Laskee yhtenäisen indivisible score:n Barandes'in teorian mukaan
    
    BARANDES'IN TEORIA:
    - Division events: Spontaaneja vuorovaikutuksia ympäristön kanssa
    - Memory depth: > 1 mutta ei liian suuri (ei täydellinen non-Markov)
    - Conditioning sparsity: Vähemmän ehdollisia P:itä kuin Markov
    - Markov violations: Moderate määrä, ei liikaa
    
    HUOM: EI OPTIMOI "TÄYDELLISYYTTÄ" - hakee realistisia arvoja!
    """
    
    # 1. DIVISION EVENTS COMPONENT (0-1)
    # Optimaalinen: 0.05-0.25 (5-25% ajoista)
    if division_rate < 0.01:
        division_component = division_rate / 0.01  # Lineaarinen nousu 0 -> 1
    elif 0.01 <= division_rate <= 0.25:
        division_component = 0.8 + 0.2 * (1 - abs(division_rate - 0.15) / 0.15)  # Optimaalinen alue
    else:
        division_component = max(0, 1 - (division_rate - 0.25) / 0.25)  # Lasku yli 0.25
    
    # 2. MEMORY DEPTH COMPONENT (0-1)  
    # Optimaalinen: 1.5-4.0 (ei Markov, ei liian kompleksi)
    if memory_depth < 0.5:
        memory_component = memory_depth / 0.5  # Liian vähän muistia
    elif 0.5 <= memory_depth <= 4.0:
        # Paras alue: 1.5-3.0
        if 1.5 <= memory_depth <= 3.0:
            memory_component = 0.9 + 0.1 * (1 - abs(memory_depth - 2.25) / 0.75)
        else:
            memory_component = 0.7 + 0.2 * (1 - abs(memory_depth - 2.25) / 1.75)
    else:
        memory_component = max(0, 1 - (memory_depth - 4.0) / 6.0)  # Liian paljon muistia
    
    # 3. CONDITIONING SPARSITY COMPONENT (0-1)
    # Optimaalinen: 0.05-0.30 (harva mutta ei liian harva)
    if conditioning_sparsity < 0.01:
        sparsity_component = conditioning_sparsity / 0.01  # Liian harva
    elif 0.01 <= conditioning_sparsity <= 0.30:
        # Paras alue: 0.08-0.20
        if 0.08 <= conditioning_sparsity <= 0.20:
            sparsity_component = 0.9 + 0.1 * (1 - abs(conditioning_sparsity - 0.14) / 0.06)
        else:
            sparsity_component = 0.7 + 0.2 * (1 - abs(conditioning_sparsity - 0.14) / 0.16)
    else:
        sparsity_component = max(0, 1 - (conditioning_sparsity - 0.30) / 0.30)  # Liian tiheä
    
    # 4. MARKOV VIOLATION COMPONENT (0-1)
    # Optimaalinen: 0.3-0.7 (moderate violations)
    if markov_violation_rate < 0.1:
        violation_component = markov_violation_rate / 0.1  # Liian Markov-mainen
    elif 0.1 <= markov_violation_rate <= 0.8:
        # Paras alue: 0.3-0.6
        if 0.3 <= markov_violation_rate <= 0.6:
            violation_component = 0.9 + 0.1 * (1 - abs(markov_violation_rate - 0.45) / 0.15)
        else:
            violation_component = 0.7 + 0.2 * (1 - abs(markov_violation_rate - 0.45) / 0.35)
    else:
        violation_component = max(0, 1 - (markov_violation_rate - 0.8) / 0.2)  # Liian ei-Markov
    
    # YHDISTÄ KOMPONENTIT (painotettu keskiarvo)
    weights = {
        'division': 0.3,      # Division events tärkein Barandes'ille
        'memory': 0.25,       # Memory depth tärkeä
        'sparsity': 0.25,     # Conditioning sparsity tärkeä  
        'violations': 0.2     # Markov violations tukeva
    }
    
    total_score = (weights['division'] * division_component +
                   weights['memory'] * memory_component +
                   weights['sparsity'] * sparsity_component + 
                   weights['violations'] * violation_component)
    
    # KRIITTISYYSCHECK: Varoita liian korkeista pisteistä
    if total_score > 0.85:
        print(f"⚠️ WARNING: {process_type} sai liian korkean indivisible score: {total_score:.3f}")
    
    return {
        'total_score': total_score,
        'components': {
            'division': division_component,
            'memory': memory_component, 
            'sparsity': sparsity_component,
            'violations': violation_component
        },
        'inputs': {
            'division_rate': division_rate,
            'memory_depth': memory_depth,
            'conditioning_sparsity': conditioning_sparsity,
            'markov_violation_rate': markov_violation_rate
        }
    }

def comprehensive_validation_test(references, division_results, memory_results):
    """
    Kokonaisvaltainen validointitesti kaikille referenssiprosesseille
    """
    validation_results = {}
    validation_passed = True
    
    for name, process in references.items():
        print(f"\n🔍 Validoidaan: {name}")
        
        # Kerää mittaustulokset
        division_rate = division_results[name]['division_rate']
        memory_depth = memory_results[name]['avg_memory_depth']
        conditioning_sparsity = memory_results[name]['conditioning_sparsity']
        markov_violation_rate = memory_results[name]['markov_violation_rate']
        
        # Laske indivisible score
        score_result = calculate_indivisible_score(
            division_rate, memory_depth, conditioning_sparsity, 
            markov_violation_rate, process_type=name
        )
        
        # Prosessispesifiset odotukset
        expected_ranges = get_expected_score_ranges(name)
        
        # Validoi että score on odotetussa rangessa
        total_score = score_result['total_score']
        expected_min, expected_max = expected_ranges['total_score']
        
        score_valid = expected_min <= total_score <= expected_max
        
        validation_results[name] = {
            'indivisible_score': score_result,
            'expected_range': expected_ranges,
            'score_valid': score_valid,
            'validation_details': validate_individual_components(score_result, expected_ranges)
        }
        
        if score_valid:
            print(f"  ✅ Score {total_score:.3f} in range [{expected_min:.2f}, {expected_max:.2f}]")
        else:
            print(f"  ❌ Score {total_score:.3f} NOT in range [{expected_min:.2f}, {expected_max:.2f}]")
            validation_passed = False
    
    return validation_results, validation_passed

def get_expected_score_ranges(process_name):
    """
    Odotettavat score-rangeet kullekin referenssiprosessille
    Perustuu Barandes'in teoriaan ja fysikaaliseen järkeen
    """
    ranges = {
        'markov': {
            'total_score': (0.0, 0.3),  # Matala indivisible-luonne
            'division': (0.0, 0.2),     # Vähän division events
            'memory': (0.2, 0.8),       # Memory depth ≈ 1
            'sparsity': (0.0, 0.2),     # Ei harvaa conditioning
            'violations': (0.0, 0.3)    # Vähän Markov violations
        },
        'deterministic': {
            'total_score': (0.0, 0.4),  # Matala indivisible-luonne
            'division': (0.0, 0.1),     # Ei division events
            'memory': (0.0, 1.0),       # Voi olla mitä tahansa (ennustettava)
            'sparsity': (0.0, 0.1),     # Ei conditioning events
            'violations': (0.0, 0.5)    # Voi olla ei-Markov deterministisesti
        },
        'indivisible': {
            'total_score': (0.4, 0.8),  # Keskikorkea indivisible-luonne
            'division': (0.6, 1.0),     # Paljon division events
            'memory': (0.6, 0.9),       # Moderate memory depth
            'sparsity': (0.6, 0.9),     # Harva conditioning
            'violations': (0.6, 0.9)    # Moderate Markov violations
        },
        'white_noise': {
            'total_score': (0.0, 0.3),  # Matala indivisible-luonne
            'division': (0.0, 0.3),     # Satunnaisia "division events"
            'memory': (0.0, 0.3),       # Ei muistia
            'sparsity': (0.0, 0.2),     # Ei conditioning structure
            'violations': (0.0, 0.4)    # Satunnaisia violations
        }
    }
    
    return ranges.get(process_name, {'total_score': (0.0, 1.0)})

def validate_individual_components(score_result, expected_ranges):
    """
    Validoi yksittäiset score-komponentit
    """
    components = score_result['components']
    validation_details = {}
    
    for comp_name, comp_value in components.items():
        expected_min, expected_max = expected_ranges.get(comp_name, (0.0, 1.0))
        is_valid = expected_min <= comp_value <= expected_max
        
        validation_details[comp_name] = {
            'value': comp_value,
            'expected_range': (expected_min, expected_max),
            'valid': is_valid
        }
    
    return validation_details

# =============================================================================
# LATAA KAIKKI TULOKSET JA VALIDOI
# =============================================================================

print("🔍 Lataan kaikki analyysitulokset...")

# Lataa referenssiprosessit
pickle_file = f"{RESULTS_DIR}/{TIMESTAMP}_01_references.pkl"
try:
    with open(pickle_file, 'rb') as f:
        references = pickle.load(f)
    print("✅ Referenssiprosessit ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Referenssiprosesseja ei löydy!")
    raise FileNotFoundError("Reference processes file not found")

# Lataa division events tulokset
detection_file = f"{RESULTS_DIR}/{TIMESTAMP}_02_division_detection.json"
try:
    with open(detection_file, 'r') as f:
        division_results = json.load(f)
    print("✅ Division events tulokset ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Division detection tuloksia ei löydy!")
    raise FileNotFoundError("Division detection results file not found")

# Lataa memory analysis tulokset
memory_file = f"{RESULTS_DIR}/{TIMESTAMP}_03_memory_analysis.json"
try:
    with open(memory_file, 'r') as f:
        memory_results = json.load(f)
    print("✅ Memory analysis tulokset ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Memory analysis tuloksia ei löydy!")
    raise FileNotFoundError("Memory analysis results file not found")

# =============================================================================
# SUORITA KOKONAISVALTAINEN VALIDOINTI
# =============================================================================

print("\n🧪 Suoritetaan kokonaisvaltainen validointitesti...")

validation_results, validation_passed = comprehensive_validation_test(
    references, division_results, memory_results
)

print(f"\n📊 VALIDOINTITULOKSET:")
if validation_passed:
    print("✅ KAIKKI VALIDOINTITESTIT LÄPÄISTY!")
    print("🎯 Mittarimme toimivat luotettavasti referenssiprosesseilla")
    print("🚀 Voimme siirtyä Vaihe 2:een (Satunnaisuustyyppi-skannaus)")
else:
    print("❌ JOITAKIN VALIDOINTITESTEJÄ EI LÄPÄISTY!")
    print("⚠️ Mittareita täytyy kalibroida ennen jatkamista")

# =============================================================================
# YHTEENVETO JA TILASTOT
# =============================================================================

print(f"\n📈 VAIHE 1 YHTEENVETO:")

summary_data = []
for name in references.keys():
    row = {
        'Process': name,
        'Division_Rate': division_results[name]['division_rate'],
        'Memory_Depth': memory_results[name]['avg_memory_depth'],
        'Conditioning_Sparsity': memory_results[name]['conditioning_sparsity'],
        'Markov_Violations': memory_results[name]['markov_violation_rate'],
        'Indivisible_Score': validation_results[name]['indivisible_score']['total_score'],
        'Score_Valid': validation_results[name]['score_valid']
    }
    summary_data.append(row)

df_summary = pd.DataFrame(summary_data)
print(df_summary.round(3))

# =============================================================================
# TALLENNA LOPULLISET TULOKSET
# =============================================================================

# Kokonaisvaltainen tulosrakenne
final_results = {
    'metadata': {
        'timestamp': TIMESTAMP,
        'phase': 'Phase_1_Validation',
        'validation_passed': validation_passed,
        'ready_for_phase2': validation_passed
    },
    'reference_processes': {name: {
        'division_rate': division_results[name]['division_rate'],
        'memory_depth': memory_results[name]['avg_memory_depth'], 
        'conditioning_sparsity': memory_results[name]['conditioning_sparsity'],
        'markov_violation_rate': memory_results[name]['markov_violation_rate'],
        'indivisible_score': validation_results[name]['indivisible_score']['total_score'],
        'score_components': validation_results[name]['indivisible_score']['components'],
        'validation_passed': validation_results[name]['score_valid']
    } for name in references.keys()},
    'summary_statistics': {
        'avg_indivisible_score': float(df_summary['Indivisible_Score'].mean()),
        'score_std': float(df_summary['Indivisible_Score'].std()),
        'highest_score_process': df_summary.loc[df_summary['Indivisible_Score'].idxmax(), 'Process'],
        'lowest_score_process': df_summary.loc[df_summary['Indivisible_Score'].idxmin(), 'Process']
    }
}

# Tallenna JSON
final_file = f"{RESULTS_DIR}/{TIMESTAMP}_04_phase1_validation.json"
with open(final_file, 'w') as f:
    json.dump(final_results, f, indent=2)

print(f"\n📊 Vaihe 1 lopulliset tulokset tallennettu: {final_file}")

# =============================================================================
# LOPULLINEN VISUALISOINTI
# =============================================================================

# Luo kattava visualisointi
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))

processes = list(references.keys())
colors = ['blue', 'orange', 'green', 'red']

# 1. Indivisible Score vertailu
scores = [validation_results[name]['indivisible_score']['total_score'] for name in processes]
bars = ax1.bar(processes, scores, color=colors, alpha=0.7)
ax1.set_ylabel('Indivisible Score')
ax1.set_title('Final Indivisible Scores')
ax1.set_ylim(0, 1)

# Lisää validation status
for i, (name, bar) in enumerate(zip(processes, bars)):
    if validation_results[name]['score_valid']:
        ax1.text(i, scores[i] + 0.02, '✅', ha='center', fontsize=12)
    else:
        ax1.text(i, scores[i] + 0.02, '❌', ha='center', fontsize=12)

# 2. Score components breakdown
components_data = []
component_names = ['division', 'memory', 'sparsity', 'violations']
for name in processes:
    components = validation_results[name]['indivisible_score']['components']
    components_data.append([components[comp] for comp in component_names])

x = np.arange(len(processes))
width = 0.2
for i, comp_name in enumerate(component_names):
    values = [components_data[j][i] for j in range(len(processes))]
    ax2.bar(x + i*width, values, width, label=comp_name, alpha=0.8)

ax2.set_xlabel('Process')
ax2.set_ylabel('Component Score')
ax2.set_title('Score Components Breakdown')
ax2.set_xticks(x + width * 1.5)
ax2.set_xticklabels(processes)
ax2.legend()

# 3. Key metrics scatter plot
division_rates = [division_results[name]['division_rate'] for name in processes]
memory_depths = [memory_results[name]['avg_memory_depth'] for name in processes]

scatter = ax3.scatter(division_rates, memory_depths, c=scores, s=200, alpha=0.8, cmap='viridis')
ax3.set_xlabel('Division Events Rate')
ax3.set_ylabel('Memory Depth')
ax3.set_title('Division Rate vs Memory Depth')
plt.colorbar(scatter, ax=ax3, label='Indivisible Score')

for i, name in enumerate(processes):
    ax3.annotate(name, (division_rates[i], memory_depths[i]), 
                xytext=(5, 5), textcoords='offset points', fontsize=9)

# 4. Expected vs Measured comparison
expected_scores = []
measured_scores = []
for name in processes:
    expected_min, expected_max = validation_results[name]['expected_range']['total_score']
    expected_scores.append((expected_min + expected_max) / 2)
    measured_scores.append(validation_results[name]['indivisible_score']['total_score'])

ax4.scatter(expected_scores, measured_scores, s=150, alpha=0.8, c=colors)
ax4.plot([0, 1], [0, 1], 'k--', alpha=0.5)
ax4.set_xlabel('Expected Score (range midpoint)')
ax4.set_ylabel('Measured Score')
ax4.set_title('Expected vs Measured Scores')

for i, name in enumerate(processes):
    ax4.annotate(name, (expected_scores[i], measured_scores[i]), 
                xytext=(5, 5), textcoords='offset points', fontsize=9)

plt.suptitle(f"Phase 1 Validation Results - Session {TIMESTAMP}", fontsize=16)
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_04_phase1_validation.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Vaihe 1 validointi visualisointi tallennettu: {img_file}")
plt.show()

print(f"\n🎯 MODUULI 4 & VAIHE 1 VALMIS!")
if validation_passed:
    print("✅ Kaikki validointitestit läpäisty - voidaan siirtyä Vaihe 2:een")
    print("🚀 Seuraavaksi: Satunnaisuustyyppi-skannaus (Moduuli 5)")
else:
    print("⚠️ Validointitestejä ei läpäisty - tarkista mittarit ennen jatkamista")
print("="*60)