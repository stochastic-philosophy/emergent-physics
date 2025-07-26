# Vaihe 1: Mittareiden Validointi (Moduulit 1-4)

## 🎯 Vaihe 1 Tavoite
Luoda ja validoida mittarit, jotka pystyvät tunnistamaan **indivisible stochastic process** -ominaisuuksia. Varmistaa että mittarit toimivat tunnetuilla referenssiprosesseilla ennen varsinaista tutkimusta.

---

## Module 1: Setup ja referenssiprosessit

### Tarkoitus
Luo neljä referenssiprosessia, jotka edustavat eri käyttäytymistyyppejä Barandes'in teorian mukaan.

### Keskeiset Funktiot

#### `pure_markov_process(n_steps=1000, n_states=50)`
```python
def pure_markov_process(n_steps=1000, n_states=50, transition_noise=0.1):
    """
    Klassinen Markov-prosessi (negatiivinen kontrolli)
    
    BARANDES: Markov-prosesseissa on KAIKKI ehdolliset todennäköisyydet
    ODOTUS: Ei division events:eja, memory depth = 1
    
    Returns:
        dict: {
            'time_series': aikasarja,
            'interaction_record': vuorovaikutukset (0),
            'expected_division_events': 0,
            'expected_memory_depth': 1.0
        }
    """
```

#### `known_indivisible_example(n_steps=1000, division_rate=0.15)`
```python
def known_indivisible_example(n_steps=1000, division_rate=0.15):
    """
    Barandes'in teorian mukainen indivisible-esimerkki
    
    BARANDES: Division events syntyvät vuorovaikutuksesta ympäristön kanssa
    ODOTUS: Spontaaneja division events:eja, memory depth > 1
    
    KRIITTINEN LOGIIKKA:
    - Division event → uusi ehdollistamisaika saatavilla
    - Riippuvuus viimeisestä division event:stä, EI edellisestä askeleesta
    - "Vintage probabilities": tavallisia P:itä, ei wave function collapse
    """
```

### Tulokset
- **JSON**: `{timestamp}_01_reference_summary.json`
- **PNG**: `{timestamp}_01_reference_processes.png`
- **PKL**: `{timestamp}_01_references.pkl` (myöhempää käyttöä varten)

---

## Module 2: Division Events Detector

### Tarkoitus
Kehittää algoritmit, jotka tunnistavat **division events** aikasarjoista. Barandes'in mukaan nämä ovat avain indivisible-ominaisuuksiin.

### Teoreetinen Tausta
**Division Event** = hetki jolloin:
1. Klassinen korrelaatio syntyy järjestelmän ja ympäristön välille
2. Uusi ehdollistamisaika tulee saataville
3. Tavallinen Markov-ketju katkeaa tilapäisesti

### Kolme Detektointimenetelmää

#### Metodi 1: Korrelaatio-pohjainen
```python
def detect_division_events_method1(time_series, interaction_record, 
                                 correlation_threshold=0.2):
    """
    MENETELMÄ 1: Korrelaatio-pohjainen division events detection
    BARANDES: Division events = klassinen korrelaatio syntyy
    
    Prosessi:
    1. Mittaa classical_correlation liukuvassa ikkunassa
    2. Etsi korrelaatio-piikit find_peaks:illa
    3. Merkitse division events korkeimmille pikeille
    """
```

#### Metodi 2: Ehdollisen riippuvuuden muutos
```python
def detect_division_events_method2(time_series, lookback_window=20):
    """
    MENETELMÄ 2: Ehdollisen riippuvuuden muutos
    BARANDES: Division event = uusi ehdollistamisaika tulee saataville
    
    Logiikka:
    - Testaa riippuvuutta eri lag:eihin
    - Jos riippuvuusrakenne muuttuu äkillisesti → division event
    - Käyttää korrelaatioita lähihistorian kanssa
    """
```

#### Metodi 3: Suora interaction record analyysi
```python
def detect_division_events_method3(time_series, interaction_record):
    """
    MENETELMÄ 3: Suora interaction record analyysi
    BARANDES: Division events = vuorovaikutus ympäristön kanssa
    """
```

### Yhdistetty Detektori
```python
def combined_division_detector(time_series, interaction_record, 
                              method_weights={'correlation': 0.3, 
                                            'dependency': 0.2, 
                                            'interaction': 0.5}):
    """
    Yhdistetty division events detector
    
    PÄIVITETTY: Korkeampi paino interaction-metodille (Barandes'in mukaan tärkeä)
    
    Returns:
        List[dict]: Division events score:ien kanssa
    """
```

### Tulokset
- **JSON**: `{timestamp}_02_division_detection.json`
- **PNG**: `{timestamp}_02_division_events.png`

---

## Module 3: Non-Markov Memory Detector

### Tarkoitus
Mittaa kuinka **pitkälle menneisyyteen** prosessi "muistaa". Indivisible-prosesseilla pitäisi olla moderate memory depth.

### Keskeiset Mittarit

#### Memory Depth
```python
def measure_memory_depth(time_series, division_events=None, max_lookback=15):
    """
    Mittaa kuinka pitkälle menneisyyteen riippuvuus ulottuu
    
    BARANDES: Indivisible - riippuvuus division events:ien kautta, 
              ei kaikista menneistä
    
    Algoritmi:
    1. Valitse analyysipisteet (division events + satunnaiset)
    2. Testaa korrelaatiota eri lag:eihin
    3. Memory depth = pisin merkittävä korrelaatio
    """
```

#### Markov-ominaisuuden testaus
```python
def markov_property_test(time_series, n_lags=5):
    """
    Testaa Markov-ominaisuutta
    MARKOV: Ei pitkäaikaista riippuvuutta
    NON-MARKOV: Pitkäaikaista riippuvuutta
    
    Testaa: I(X_t; X_{t-k} | X_{t-1}) = 0 ?
    """
```

#### Conditioning Sparsity
```python
def calculate_available_conditioning_times(time_series, division_events):
    """
    BARANDES: Indivisible processes - vähemmän ehdollisia todennäköisyyksiä
    
    Ei kaikkia aikahetkiä voi käyttää ehdollistamiseen, 
    vain division events:it
    
    Returns:
        dict: {
            'conditioning_sparsity': available_times / total_times
        }
    """
```

### Tulokset
- **JSON**: `{timestamp}_03_memory_analysis.json`
- **PNG**: `{timestamp}_03_memory_analysis.png`

---

## Module 4: Validointitestit & Indivisible Score

### Tarkoitus
Yhdistää kaikki mittarit **yhtenäiseksi indivisible score:ksi** ja validoi että mittarit toimivat referenssiprosesseilla.

### Indivisible Score Laskenta

```python
def calculate_indivisible_score(division_rate, memory_depth, conditioning_sparsity, 
                               markov_violation_rate):
    """
    Laskee yhtenäisen indivisible score:n Barandes'in teorian mukaan
    
    BARANDES'IN TEORIA:
    - Division events: Spontaaneja vuorovaikutuksia (optimum: 0.05-0.25)
    - Memory depth: > 1 mutta ei liian suuri (optimum: 1.5-4.0)
    - Conditioning sparsity: Vähemmän ehdollisia P:itä (optimum: 0.05-0.30)
    - Markov violations: Moderate määrä (optimum: 0.3-0.7)
    
    EI OPTIMOI "TÄYDELLISYYTTÄ" - hakee realistisia arvoja!
    
    Returns:
        dict: {
            'total_score': 0-1,
            'components': {...}
        }
    """
```

### Komponenttien Painotus
- **Division events**: 30% (tärkein Barandes'ille)
- **Memory depth**: 25%
- **Conditioning sparsity**: 25%
- **Markov violations**: 20% (tukeva)

### Validointitestit

#### Prosessispesifiset Odotukset
```python
def get_expected_score_ranges(process_name):
    """
    Odotettavat score-rangeet kullekin referenssiprosessille
    
    'markov': total_score (0.0, 0.3)      # Matala indivisible-luonne
    'deterministic': total_score (0.0, 0.4) # Matala indivisible-luonne  
    'indivisible': total_score (0.4, 0.8)   # Keskikorkea indivisible-luonne
    'white_noise': total_score (0.0, 0.3)   # Matala indivisible-luonne
    """
```

### Kriittisyysanalyysi
- Markov-prosessi: division_rate < 0.1 ✓
- Deterministinen: division_rate < 0.05 ✓
- Indivisible: division_rate > 0.05 ✓
- White noise: division_rate < 0.08 ✓

### Tulokset
- **JSON**: `{timestamp}_04_phase1_validation.json`
   - Kaikki referenssiprosessien scoret
   - Validointitestien tulokset
   - `ready_for_phase2: true/false`
- **PNG**: `{timestamp}_04_phase1_validation.png`

---

## 🎯 Vaihe 1 Onnistumisperusteet

### ✅ Validointi läpäisty jos:
1. **Markov score** < 0.3
2. **Deterministinen score** < 0.4  
3. **Indivisible score** 0.4-0.8 rangessa
4. **White noise score** < 0.3

### ❌ Validointi epäonnistui jos:
- Mittarit antavat epäloogisia tuloksia
- Indivisible-esimerkki ei erotu muista
- Score komponentit käyttäytyvät odottamattomasti

### 🚀 Seuraava vaihe
Jos validointi läpäisty → **Vaihe 2**: Satunnaisuustyyppi-skannaus

---

## 🔧 Tekniset Huomiot

### Google Colab Optimoinnit
- Matriisikoko rajoitettu: max 500×500
- Aikasarjat: max 1000 pistettä  
- Memory depth: max_lookback=15
- Mutual information: fallback scipy:llä

### Toistettavuus
- **MAIN_RANDOM_SEED = 42**
- Kaikki parametrit JSON:iin
- Session timestamp yhdistää tiedostot
- Pickle backup tärkeille tuloksille

### Fallback Strategiat
- sklearn → scipy → numpy
- NetworkX → yksinkertaiset algoritmit
- Kompleksiset funktiot → approksimoidut versiot
