# MODUULI 7: Tulosten analyysi ja ranking
# Indivisible Stochastic Processes tutkimus - Vaihe 2.3

import numpy as np
import matplotlib.pyplot as plt
import json
import pandas as pd
from datetime import datetime
import glob
from scipy import stats

# Seaborn import with fallback
try:
    import seaborn as sns
    sns.set_style("whitegrid")
    SEABORN_AVAILABLE = True
except ImportError:
    SEABORN_AVAILABLE = False
    print("⚠️ Seaborn ei saatavilla - käytetään matplotlib:ia")

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

print(f"🔬 MODUULI 7: Tulosten analyysi ja ranking")
print(f"📅 Session: {TIMESTAMP}")
print(f"🎯 Vaihe 2.3: Satunnaisuustyyppien ranking ja fysikaaliset johtopäätökset")
print("="*60)

# =============================================================================
# LATAA SYSTEMATIC TESTING TULOKSET
# =============================================================================

print("🔍 Lataan systematic testing tuloksia...")

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_06_systematic_testing.json"
try:
    with open(results_file, 'r') as f:
        systematic_data = json.load(f)
    print("✅ Systematic testing tulokset ladattu")
except FileNotFoundError:
    print("❌ VIRHE: Systematic testing tuloksia ei löydy!")
    raise FileNotFoundError("Systematic testing results not found")

systematic_results = systematic_data['systematic_results']
test_params = systematic_data['test_parameters']

print(f"📊 Ladattiin {len(systematic_results)} testikombinaaciota")
print(f"🔬 Testausparametrit: {test_params['n_monte_carlo']} MC toistoa, "
      f"{test_params['time_series_length']} pisteen aikasarjat")

# =============================================================================
# LUOKITTELE JA RANKING TULOKSET
# =============================================================================

print("\n📈 Analysoidaan tuloksia...")

# Muunna DataFrame:ksi helpompaa analyysia varten - KORJATTU
analysis_data = []
for key, result in systematic_results.items():
    # Varmista että result sisältää tarvittavat kentät
    if (result.get('n_successful_trials', 0) > 0 and 
        'avg_indivisible_score' in result and 
        'randomness_type' in result):
        
        analysis_data.append({
            'test_id': key,
            'randomness_type': result['randomness_type'],
            'interaction_strength': result.get('interaction_strength', 0.15),
            'avg_indivisible_score': result.get('avg_indivisible_score', 0.0),
            'std_indivisible_score': result.get('std_indivisible_score', 0.0),
            'avg_division_rate': result.get('avg_division_rate', 0.0),
            'avg_memory_depth': result.get('avg_memory_depth', 0.0),
            'avg_interaction_rate': result.get('avg_interaction_rate', 0.0),
            'success_rate': result.get('success_rate', 0.0),
            'division_component': result.get('avg_score_components', {}).get('division', 0.0),
            'memory_component': result.get('avg_score_components', {}).get('memory', 0.0),
            'interaction_component': result.get('avg_score_components', {}).get('interaction', 0.0)
        })

if len(analysis_data) == 0:
    print("❌ VIRHE: Ei onnistuneita testejä analysoitavaksi!")
    raise ValueError("No successful tests to analyze")

df = pd.DataFrame(analysis_data)
print(f"✅ {len(df)} onnistunutta testiä analysoitavaksi")

# =============================================================================
# RANKING ANALYYSI
# =============================================================================

print("\n🏆 RANKING ANALYYSI:")

# 1. Paras indivisible score per satunnaisuustyyppi
best_per_type = df.groupby('randomness_type')['avg_indivisible_score'].max().sort_values(ascending=False)

print("\n📊 TOP 10 SATUNNAISUUSTYYPPIÄ (paras score per tyyppi):")
for i, (rand_type, score) in enumerate(best_per_type.head(10).items()):
    # Hae optimaalinen interaction strength tälle tyypille
    best_row = df[(df['randomness_type'] == rand_type) & 
                  (df['avg_indivisible_score'] == score)].iloc[0]
    interaction = best_row['interaction_strength']
    std = best_row['std_indivisible_score']
    
    # Luokittele satunnaisuustyyppi
    if rand_type in ['binary_01', 'binary_pm1', 'uniform_01', 'uniform_pm1', 'gaussian_std']:
        category = "SIMPLE"
    elif rand_type in ['exponential', 'cauchy', 'log_normal', 'student_t', 'chi2']:
        category = "MATHEMATICAL"
    elif 'complex' in rand_type or rand_type in ['fractional_brownian', 'pink_noise']:
        category = "COMPLEX"
    else:
        category = "OTHER"
    
    print(f"  {i+1:2d}. {rand_type:20s} | {score:.3f} ± {std:.3f} | int={interaction} | {category}")

# =============================================================================
# TILASTOLLINEN ANALYYSI
# =============================================================================

print("\n📈 TILASTOLLINEN ANALYYSI:")

# Keskiarvot kategorialle
category_mapping = {
    'binary_01': 'SIMPLE', 'binary_pm1': 'SIMPLE', 'uniform_01': 'SIMPLE', 
    'uniform_pm1': 'SIMPLE', 'gaussian_std': 'SIMPLE',
    'exponential': 'MATHEMATICAL', 'cauchy': 'MATHEMATICAL', 'log_normal': 'MATHEMATICAL',
    'student_t': 'MATHEMATICAL', 'chi2': 'MATHEMATICAL',
    'complex_gaussian': 'COMPLEX', 'complex_uniform': 'COMPLEX',
    'fractional_brownian': 'COMPLEX', 'pink_noise': 'COMPLEX'
}

df['category'] = df['randomness_type'].map(category_mapping)

# Kategoriatasoinen analyysi
category_stats = df.groupby('category').agg({
    'avg_indivisible_score': ['mean', 'std', 'max'],
    'avg_division_rate': 'mean',
    'avg_memory_depth': 'mean',
    'avg_interaction_rate': 'mean'
}).round(3)

print("\n📊 KATEGORIATASOINEN VERTAILU:")
print(category_stats)

# Interaction strength analyysi
interaction_analysis = df.groupby('interaction_strength')['avg_indivisible_score'].agg(['mean', 'std', 'max']).round(3)
print(f"\n🔗 INTERACTION STRENGTH ANALYYSI:")
print(interaction_analysis)

# Statistical significance testit
print(f"\n🧪 TILASTOLLINEN MERKITSEVYYS:")

try:
    # T-test: COMPLEX vs SIMPLE
    complex_scores = df[df['category'] == 'COMPLEX']['avg_indivisible_score']
    simple_scores = df[df['category'] == 'SIMPLE']['avg_indivisible_score']

    if len(complex_scores) > 1 and len(simple_scores) > 1:
        t_stat, p_value = stats.ttest_ind(complex_scores, simple_scores)
        print(f"  COMPLEX vs SIMPLE: t={t_stat:.3f}, p={p_value:.4f}")
        if p_value < 0.05:
            print(f"  ✅ Tilastollisesti merkitsevä ero (p < 0.05)")
        else:
            print(f"  ⚠️ Ei tilastollisesti merkitsevää eroa")
    else:
        print(f"  ⚠️ Ei riittävästi dataa tilastolliseen testiin")
        p_value = 1.0  # Ei merkitsevä
        
except Exception as e:
    print(f"  ❌ Tilastollinen testi epäonnistui: {str(e)[:50]}")
    p_value = 1.0

# =============================================================================
# FYSIKAALISET JOHTOPÄÄTÖKSET
# =============================================================================

print(f"\n🧬 FYSIKAALISET JOHTOPÄÄTÖKSET:")

# 1. Paras satunnaisuustyyppi kokonaisuudessaan
overall_best = df.loc[df['avg_indivisible_score'].idxmax()]
print(f"\n🏆 PARAS SATUNNAISUUSTYYPPI:")
print(f"  Type: {overall_best['randomness_type']}")
print(f"  Score: {overall_best['avg_indivisible_score']:.3f} ± {overall_best['std_indivisible_score']:.3f}")
print(f"  Optimal interaction: {overall_best['interaction_strength']}")
print(f"  Category: {overall_best['category']}")

# 2. Kompleksilukujen analyysi
complex_types = df[df['randomness_type'].str.contains('complex')]
if len(complex_types) > 0 and len(df) > len(complex_types):
    avg_complex_score = complex_types['avg_indivisible_score'].mean()
    real_types = df[~df['randomness_type'].str.contains('complex')]
    avg_real_score = real_types['avg_indivisible_score'].mean()
    
    print(f"\n🔢 KOMPLEKSILUKUJEN VAIKUTUS:")
    print(f"  Kompleksilukujen keskiarvo: {avg_complex_score:.3f}")
    print(f"  Reaalilukujen keskiarvo: {avg_real_score:.3f}")
    print(f"  Parannus: {((avg_complex_score/avg_real_score - 1)*100):+.1f}%")
    
    if avg_complex_score > avg_real_score:
        print(f"  ✅ Kompleksiluvut tuottavat korkeampia indivisible score:ja")
        print(f"  💡 JOHTOPÄÄTÖS: Kvanttimekaniikan kompleksiluvut voivat olla fundamentaaleja")
    else:
        print(f"  ⚠️ Kompleksiluvut eivät ole merkittävästi parempia")
else:
    print(f"\n🔢 KOMPLEKSILUKUJEN VAIKUTUS:")
    print(f"  ⚠️ Ei riittävästi kompleksiluku-testejä vertailuun")
    avg_complex_score = 0
    avg_real_score = 1  # Vältetään jako nollalla

# 3. Optimaalinen interaction strength
best_interaction = df.groupby('interaction_strength')['avg_indivisible_score'].mean().idxmax()
print(f"\n🔗 OPTIMAALINEN INTERACTION STRENGTH:")
print(f"  Paras: {best_interaction}")
print(f"  💡 JOHTOPÄÄTÖS: Division events syntyvät optimaalisesti ~{best_interaction*100:.0f}% todennäköisyydellä")

# 4. Score komponenttien analyysi
print(f"\n⚙️ SCORE KOMPONENTTIEN ANALYYSI:")
try:
    top5_types = df.nlargest(5, 'avg_indivisible_score')['randomness_type'].unique()
    if len(top5_types) > 0:
        component_analysis = df[df['randomness_type'].isin(top5_types)].groupby('randomness_type')[
            ['division_component', 'memory_component', 'interaction_component']].mean()

        print(f"  Top {len(top5_types)} satunnaisuustyypeistä:")
        for rand_type in top5_types:
            if rand_type in component_analysis.index:
                comp = component_analysis.loc[rand_type]
                dominant = comp.idxmax().replace('_component', '')
                print(f"    {rand_type}: Division={comp['division_component']:.2f}, "
                      f"Memory={comp['memory_component']:.2f}, Interaction={comp['interaction_component']:.2f} "
                      f"(Dominant: {dominant})")
    else:
        print(f"  ⚠️ Ei riittävästi dataa komponenttianalyysiin")
        component_analysis = pd.DataFrame()  # Tyhjä DataFrame
        
except Exception as e:
    print(f"  ❌ Komponenttianalyysi epäonnistui: {str(e)[:50]}")
    component_analysis = pd.DataFrame()

# =============================================================================
# VISUALISOINNIT
# =============================================================================

print(f"\n📊 Luodaan visualisoinnit...")

# 1. Overall ranking
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))

# Top 10 satunnaisuustyyppi
top10_data = df.groupby('randomness_type')['avg_indivisible_score'].max().sort_values(ascending=True).tail(10)
colors = ['red' if 'complex' in name else 'blue' if name in ['gaussian_std', 'uniform_pm1'] else 'green' 
          for name in top10_data.index]

ax1.barh(range(len(top10_data)), top10_data.values, color=colors, alpha=0.7)
ax1.set_yticks(range(len(top10_data)))
ax1.set_yticklabels(top10_data.index, fontsize=10)
ax1.set_xlabel('Indivisible Score')
ax1.set_title('Top 10 Satunnaisuustyyppiä\n(Punainen=Complex, Sininen=Simple, Vihreä=Mathematical)')
ax1.grid(True, alpha=0.3)

# 2. Kategoria vertailu
category_means = df.groupby('category')['avg_indivisible_score'].mean()
category_stds = df.groupby('category')['avg_indivisible_score'].std()

ax2.bar(category_means.index, category_means.values, 
        yerr=category_stds.values, capsize=5, alpha=0.7,
        color=['skyblue', 'lightcoral', 'lightgreen'])
ax2.set_ylabel('Keskimääräinen Indivisible Score')
ax2.set_title('Kategoriatasoinen Vertailu')
ax2.grid(True, alpha=0.3)

# 3. Interaction strength vaikutus
for category in df['category'].unique():
    subset = df[df['category'] == category]
    interaction_means = subset.groupby('interaction_strength')['avg_indivisible_score'].mean()
    ax3.plot(interaction_means.index, interaction_means.values, 'o-', label=category, linewidth=2, markersize=6)

ax3.set_xlabel('Interaction Strength')
ax3.set_ylabel('Keskimääräinen Indivisible Score')
ax3.set_title('Interaction Strength Vaikutus Kategorioittain')
ax3.legend()
ax3.grid(True, alpha=0.3)

# 4. Score komponentit top 5:lle
top5_indices = df.nlargest(5, 'avg_indivisible_score').index
components = ['division_component', 'memory_component', 'interaction_component']
x = np.arange(5)
width = 0.25

for i, comp in enumerate(components):
    values = df.loc[top5_indices, comp].values
    ax4.bar(x + i*width, values, width, label=comp.replace('_component', '').title(), alpha=0.8)

ax4.set_xlabel('Top 5 Testit')
ax4.set_ylabel('Komponentti Score')
ax4.set_title('Score Komponentit - Top 5 Tulokset')
ax4.set_xticks(x + width)
ax4.set_xticklabels([f"{df.loc[idx, 'randomness_type'][:8]}" for idx in top5_indices], rotation=45)
ax4.legend()
ax4.grid(True, alpha=0.3)

plt.suptitle(f"Vaihe 2 Satunnaisuusanalyysi - Session {TIMESTAMP}", fontsize=16)
plt.tight_layout()

# Tallenna kuva
img_file = f"{RESULTS_DIR}/{TIMESTAMP}_07_randomness_analysis.png"
plt.savefig(img_file, dpi=150, bbox_inches='tight')
print(f"📈 Analyysi visualisointi tallennettu: {img_file}")
plt.show()

# =============================================================================
# SUOSITUKSET VAIHE 3:LLE
# =============================================================================

print(f"\n🚀 SUOSITUKSET VAIHE 3:LLE (Hybridimallit):")

# Valitse parhaat satunnaisuustyypit hybridimalleja varten
top_randomness_types = best_per_type.head(3).index.tolist()
optimal_interaction = best_interaction

recommendations = {
    'top_randomness_types': top_randomness_types,
    'optimal_interaction_strength': optimal_interaction,
    'best_overall_result': {
        'randomness_type': overall_best['randomness_type'],
        'score': float(overall_best['avg_indivisible_score']),
        'interaction_strength': float(overall_best['interaction_strength'])
    },
    'complex_numbers_beneficial': bool(avg_complex_score > avg_real_score) if len(complex_types) > 0 else False,
    'statistical_significance': bool(p_value < 0.05) if 'p_value' in locals() else False
}

print(f"  1. Käytä näitä satunnaisuustyyppejä: {top_randomness_types}")
print(f"  2. Optimaalinen interaction strength: {optimal_interaction}")
print(f"  3. Kompleksilukujen käyttö: {'Suositeltu' if recommendations['complex_numbers_beneficial'] else 'Ei välttämätön'}")
print(f"  4. Paras kokonaistulos: {overall_best['randomness_type']} (score: {overall_best['avg_indivisible_score']:.3f})")

# =============================================================================
# TALLENNA LOPULLISET TULOKSET
# =============================================================================

final_results = {
    'phase2_summary': {
        'best_randomness_type': overall_best['randomness_type'],
        'best_indivisible_score': float(overall_best['avg_indivisible_score']),
        'optimal_interaction_strength': float(optimal_interaction),
        'total_tests_analyzed': len(df),
        'categories_tested': df['category'].unique().tolist()
    },
    'rankings': {
        'top10_by_type': {k: float(v) for k, v in best_per_type.head(10).items()},
        'category_averages': {k: float(v) for k, v in category_means.items()},
        'interaction_strength_analysis': {k: {kk: float(vv) for kk, vv in v.items()} 
                                        for k, v in interaction_analysis.to_dict().items()}
    },
    'physical_conclusions': {
        'complex_numbers_beneficial': recommendations['complex_numbers_beneficial'],
        'optimal_division_event_rate': float(optimal_interaction),
        'dominant_score_component': component_analysis.mean().idxmax() if len(component_analysis) > 0 else 'unknown'
    },
    'phase3_recommendations': recommendations,
    'statistical_tests': {
        'complex_vs_simple_pvalue': float(p_value) if 'p_value' in locals() else None,
        'statistically_significant': bool(p_value < 0.05) if 'p_value' in locals() else False
    },
    'timestamp': TIMESTAMP
}

results_file = f"{RESULTS_DIR}/{TIMESTAMP}_07_phase2_final.json"
with open(results_file, 'w') as f:
    json.dump(final_results, f, indent=2)

print(f"\n📊 Vaihe 2 lopulliset tulokset tallennettu: {results_file}")

print(f"\n🎯 VAIHE 2 VALMIS!")
print(f"✅ {len(systematic_results)} testiä analysoitu")
print(f"🏆 Paras satunnaisuustyyppi: {overall_best['randomness_type']}")
print(f"📈 Paras indivisible score: {overall_best['avg_indivisible_score']:.3f}")
print(f"🔗 Optimaalinen interaction: {optimal_interaction}")
print(f"🚀 Valmis Vaihe 3:lle: Hybridimallit parhaimmilla satunnaisuustyypeillä")
print("="*60)