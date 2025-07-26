# Vaihe 2: Satunnaisuusanalyysi (Moduulit 5-7)

## 🎯 Vaihe 2 Tavoite
Löytää **optimaaliset satunnaisuustyypit** jotka tuottavat korkeimmat indivisible scores yksinkertaisissa hybridimalleissa. Testata systemaattisesti eri satunnaisuuslähteitä.

---

## Module 5: Satunnaisuusgeneraattorit & Simple Hybrid

### Tarkoitus
Määritellä kattava joukko satunnaisuusgeneraattoreita kolmessa tasossa ja luoda yksinkertainen hybridimalli testausta varten.

### Satunnaisuusgeneraattorit

#### Level 1: Yksinkertainen satunnaisuus
```python
randomness_level1 = {
    'binary_01': lambda size: np.random.choice([0, 1], size=size),
    'binary_pm1': lambda size: np.random.choice([-1, 1], size=size),
    'uniform_01': lambda size: np.random.uniform(0, 1, size=size),
    'uniform_pm1': lambda size: np.random.uniform(-1, 1, size=size),
    'gaussian_std': lambda size: np.random.normal(0, 1, size=size)
}
```

#### Level 2: Matemaattisesti mielenkiintoinen
```python
randomness_level2 = {
    'levy_flight': lambda size: safe_levy_flight(size),
    'power_law': lambda size: (np.random.uniform(0.001, 1, size=size))**(-1/2.5),
    'exponential': lambda size: np.random.exponential(1, size=size),
    'cauchy': lambda size: np.random.standard_cauchy(size=size),
    'log_normal': lambda size: np.random.lognormal(0, 1, size=size),
    'student_t': lambda size: safe_student_t(size)
}
```

#### Level 3: Kompleksi & korreloitu
```python
randomness_level3 = {
    'complex_gaussian': lambda size: (np.random.normal(0, 1, size=size) + 
                                     1j*np.random.normal(0, 1, size=size)) / np.sqrt(2),
    'complex_uniform': lambda size: (np.random.uniform(-1, 1, size=size) + 
                                    1j*np.random.uniform(-1, 1, size=size)),
    'fractional_brownian': lambda size: generate_fractional_brownian_motion(hurst=0.7, n=size),
    'pink_noise': lambda size: generate_pink_noise(n=size, beta=1.0),
    'correlated_binary': lambda size: generate_correlated_binary(correlation=0.3, n=size)
}
```

### Turvallisuus & Fallbacks

#### Fractional Brownian Motion
```python
def generate_fractional_brownian_motion(hurst=0.7, n=1000):
    """
    Fractional Brownian Motion (fBm) - pitkän kantaman korrelaatio
    
    HUOM: Yksinkertainen approksimaatio, ei täydellinen fBm
    Käyttää konvoluutiota Gaussian white noisen kanssa
    """
```

#### Pink Noise (1/f)
```python
def generate_pink_noise(n=1000, beta=1.0):
    """
    Pink noise (1/f^beta noise) - scale-invariant
    KORJATTU: Parempi inf/nan käsittely
    
    Fallback: Jos FFT epäonnistuu → korreloitu Gaussian
    """
```

### Simple Hybrid Model

```python
def create_simple_hybrid(random_input, hybrid_type='time_evolution', 
                        interaction_strength=0.15):
    """
    Yksinkertainen hybridimalli eri satunnaisuuksille
    TAVOITE: Tuottaa time series jossa voi syntyä indivisible-käyttäytymistä
    
    Kolme mallia:
    1. time_evolution: X(t+1) = f(X(t), R(t), vuorovaikutukset)
    2. rmt_based: Random Matrix Theory pohjainen
    3. oscillator_network: Kytkettyjen oskillaattoreiden verkko
    
    Returns:
        dict: {
            'time_series': aikasarja,
            'interaction_record': division events merkit,
            'hybrid_type': mallin tyyppi
        }
    """
```

#### Time Evolution Malli
```python
# Aikakehitys: X(t+1) = f(X(t), R(t), vuorovaikutukset)
for t in range(1, n):
    if np.random.random() < interaction_strength:
        # Division event: uusi satunnainen komponentti
        time_series[t] = 0.3 * prev_state + 0.7 * new_component
        interaction_record[t-1] = 1.0
    else:
        # Tavallinen evoluutio
        time_series[t] = 0.8 * prev_state + 0.1 * noise
```

### Testaus & Validointi
- Testaa jokainen generaattori 100 pisteellä
- Tarkista: mean, std, min, max, inf/nan
- Testaa hybridimallit muutamalla satunnaisuustyypillä

### Tulokset
- **JSON**: `{timestamp}_05_randomness_testing.json`
- **PNG**: `{timestamp}_05_randomness_examples.png`

---

## Module 6: Systematic Testing Loop (Monte Carlo)

### Tarkoitus
Systemaattinen Monte Carlo -testaus kaikilla toimivilla satunnaisuustyypeillä. Löytää parhaat kombinaatiot ennen vaativampaa parametrioptimointia.

### Monte Carlo Parametrit (Google Colab optimoitu)
```python
N_MONTE_CARLO = 30              # 30 toistoa per tyyppi
TIME_SERIES_LENGTH = 800        # Lyhyempi koko (nopeus)
INTERACTION_STRENGTHS = [0.1, 0.15, 0.2]  # Testaa eri vahvuuksia
```

### Nopeutetut Mittarit

#### Nopea Division Events Detector
```python
def detect_division_events_simple(time_series, interaction_record):
    """
    Yksinkertaistettu division events detector - KORJATTU
    
    Käyttää:
    1. Korrelaatio-piikit (correlation_threshold=0.2)
    2. Suorat vuorovaikutukset (interaction_threshold=0.3)
    3. Yhdistää yksinkertainen scoring
    """
```

#### Nopea Memory Depth
```python
def measure_memory_depth_simple(time_series, max_lookback=10):
    """
    Yksinkertaistettu memory depth mittari
    
    - Testaa 5-10 satunnaisessa pisteessä
    - Pienemmät ikkunat (6 vs 10)
    - Correlation threshold 0.25
    """
```

#### Nopea Indivisible Score
```python
def calculate_indivisible_score_simple(division_rate, memory_depth, interaction_rate):
    """
    Yksinkertaistettu 3-komponenttinen score
    - Division component (optimum 0.05-0.25)
    - Memory component (optimum 1.5-4.0)  
    - Interaction component (optimum 0.05-0.25)
    
    Painot: 0.4 + 0.4 + 0.2
    """
```

### Pääsilmukka

```python
for interaction_strength in INTERACTION_STRENGTHS:
    for rand_name, rand_generator in working_generators.items():
        for trial in range(N_MONTE_CARLO):
            try:
                # 1. Generoi satunnaisuus
                random_input = rand_generator(TIME_SERIES_LENGTH)
                
                # 2. Luo hybridi (nopea versio)
                time_series, interaction_record = create_simple_hybrid_fast(
                    random_input, interaction_strength
                )
                
                # 3. Analysoi (nopeat mittarit)
                division_events = detect_division_events_simple(...)
                memory_depths = measure_memory_depth_simple(...)
                
                # 4. Laske score
                score = calculate_indivisible_score_simple(...)
                
            except Exception as e:
                # Kirjaa virheet mutta jatka
                pass
```

### Tilastollinen Analyysi
Jokaiselle `{randomness_type}_{interaction_strength}` kombinaatiolle:
- **n_successful_trials** / n_total_trials
- **avg_indivisible_score** ± std
- **avg_division_rate**, **avg_memory_depth**, **avg_interaction_rate**

### Tulokset
- **JSON**: `{timestamp}_06_systematic_testing.json`
- TOP 5 tulokset välittömästi näkyvissä

---

## Module 7: Tulosten analyysi ja ranking

### Tarkoitus
Analysoi systematic testing tulokset, luo ranking ja anna **fysikaaliset johtopäätökset** parhaimmista satunnaisuustyypeistä.

### Analyysi Pipeline

#### 1. DataFrame Muunnos & Kategorisaatio
```python
# Luokittele satunnaisuustyypit
category_mapping = {
    'binary_01': 'SIMPLE', 'binary_pm1': 'SIMPLE', 
    'gaussian_std': 'SIMPLE', 'uniform_pm1': 'SIMPLE',
    
    'exponential': 'MATHEMATICAL', 'cauchy': 'MATHEMATICAL', 
    'log_normal': 'MATHEMATICAL', 'student_t': 'MATHEMATICAL',
    
    'complex_gaussian': 'COMPLEX', 'complex_uniform': 'COMPLEX',
    'fractional_brownian': 'COMPLEX', 'pink_noise': 'COMPLEX'
}
```

#### 2. Ranking Analyysi
```python
# Paras score per satunnaisuustyyppi
best_per_type = df.groupby('randomness_type')['avg_indivisible_score'].max()

# TOP 10 tulokset:
for rand_type, score in best_per_type.head(10).items():
    interaction = best_row['interaction_strength']
    category = category_mapping[rand_type]
    print(f"{rand_type:20s} | {score:.3f} | int={interaction} | {category}")
```

#### 3. Tilastollinen Merkitsevyys
```python
# T-test: COMPLEX vs SIMPLE kategoriat
complex_scores = df[df['category'] == 'COMPLEX']['avg_indivisible_score']
simple_scores = df[df['category'] == 'SIMPLE']['avg_indivisible_score']

t_stat, p_value = stats.ttest_ind(complex_scores, simple_scores)
if p_value < 0.05:
    print("✅ Tilastollisesti merkitsevä ero")
```

### Fysikaaliset Johtopäätökset

#### 1. Satunnaisuustyyppien Hierarkia
```python
# Analyysiprosessi:
overall_best = df.loc[df['avg_indivisible_score'].idxmax()]
print(f"PARAS: {overall_best['randomness_type']}")
print(f"Score: {overall_best['avg_indivisible_score']:.3f}")
print(f"Optimal interaction: {overall_best['interaction_strength']}")
```

#### 2. Kompleksilukujen Analyysi
```python
complex_types = df[df['randomness_type'].str.contains('complex')]
real_types = df[~df['randomness_type'].str.contains('complex')]

if avg_complex_score > avg_real_score:
    print("✅ Kompleksiluvut tuottavat korkeampia indivisible score:ja")
    print("💡 JOHTOPÄÄTÖS: Kvanttimekaniikan kompleksiluvut fundamentaaleja")
else:
    print("⚠️ Kompleksiluvut eivät ole merkittävästi parempia")
    print("💡 JOHTOPÄÄTÖS: Kompleksiluvut emergentit, ei fundamentaalit")
```

#### 3. Optimaalinen Interaction Strength
```python
best_interaction = df.groupby('interaction_strength')['avg_indivisible_score'].mean().idxmax()
print(f"OPTIMAALINEN: {best_interaction}")
print(f"💡 Division events syntyvät optimaalisesti ~{best_interaction*100:.0f}% todennäköisyydellä")
```

### Vaihe 3 Suositukset

```python
recommendations = {
    'top_randomness_types': best_per_type.head(3).index.tolist(),
    'optimal_interaction_strength': best_interaction,
    'best_overall_result': {
        'randomness_type': overall_best['randomness_type'],
        'score': overall_best['avg_indivisible_score']
    },
    'complex_numbers_beneficial': avg_complex_score > avg_real_score,
    'statistical_significance': p_value < 0.05
}
```

### Visualisoinnit
1. **Top 10 satunnaisuustyyppiä** (värikoodattu kategorioittain)
2. **Kategoriatasoinen vertailu** (SIMPLE vs MATHEMATICAL vs COMPLEX)
3. **Interaction strength vaikutus** kategorioittain
4. **Score komponentit** top 5 tuloksille

### Tulokset
- **JSON**: `{timestamp}_07_phase2_final.json`
   - Kaikki ranking tiedot
   - Fysikaaliset johtopäätökset
   - Vaihe 3 suositukset
- **PNG**: `{timestamp}_07_randomness_analysis.png`

---

## 🎯 Vaihe 2 Odotetut Tulokset

### Ranking (hypoteesi)
1. **binary_pm1**: ~0.95 (Digital Physics tuki)
2. **complex_gaussian**: ~0.90 (Kvanttimekaniikka)
3. **binary_01**: ~0.88 (Digital, mutta vähennetty symmetria)
4. **gaussian_std**: ~0.85 (Klassinen, mutta hyvin toimiva)
5. **fractional_brownian**: ~0.83 (Pitkän kantaman korrelaatio)

### Kategoriavertailu
- **SIMPLE**: Keskiarvo ~0.82 (yllättäen hyvä)
- **MATHEMATICAL**: Keskiarvo ~0.78 (vaihteleva)
- **COMPLEX**: Keskiarvo ~0.85 (jos kompleksiluvut hyödyllisiä)

### Interaction Strength
- **Optimaalinen**: ~0.10-0.12
- **JOHTOPÄÄTÖS**: Division events harvoja (~10%) mutta kriittisiä

---

## 🔬 Tieteelliset Implikaatiot

### Jos Binary Dominoi
- **Digital Physics** saa vahvaa tukea
- Todellisuus fundamentaalisesti **diskreetti**
- Wheeler's "It from Bit" vahvistettu
- Kvantti-klassinen raja = **informaationkäsittelyn** ero

### Jos Complex Numbers Dominoi
- Kvanttimekaniikan **kompleksiluvut fundamentaaleja**
- Hilbert space rakenne välttämätön
- Standard kvanttimuotoilu oikea

### Jos Complex Numbers EI Dominoi
- Kompleksiluvut **emergentit/laskennalliset**
- Real quantum mechanics mahdollinen
- Barandes'in teoria vahvistettu

### Division Events Frequency
- **~10%**: Harvat mutta kriittiset (Barandes'in teoria)
- **>20%**: Jatkuva kvantti-ympäristö vuorovaikutus
- **<5%**: Liian harvat, lähes deterministinen

---

## 🚀 Siirtyminen Vaihe 3:een

### Edellytykset
- ✅ Tilastollisesti merkitsevät erot löydetty
- ✅ Top 3 satunnaisuustyyppiä tunnistettu  
- ✅ Optimaalinen interaction strength määritetty
- ✅ Fysikaaliset johtopäätökset dokumentoitu

### Siirrettävät Parametrit
- **TOP_RANDOMNESS_TYPES**: 3 parasta tyyppiä
- **OPTIMAL_INTERACTION**: Paras interaction strength
- **COMPLEX_BENEFICIAL**: Kompleksilukujen hyöty (boolean)

### Vaihe 3 Fokus
Ottaa parhaat satunnaisuustyypit ja kehittää **monimutkaisia hybridimalleja**:
- RMT + Fractals
- Percolation + RMT  
- Triple Hybrid (kaikki kolme)

Parameter optimization näillä malleilla → **lopullinen indivisible score**
