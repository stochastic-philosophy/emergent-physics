# Emergent Physics Research Platform

## 🎯 Vaihe 1 valmis - Perusrakenne ja debug-työkalut

Tämä on **Vaihe 1** implementation: minimaalinen SPA-runko debug-työkaluineen.

## 🔧 Korjattu v1.1 (2025-01-25)

### ✅ Korjaukset:
- **🐛 Debug.html console-virhe korjattu** - console.log override toimii nyt oikein
- **🔙 Takaisin-linkki lisätty** - projektisivuilta pääsee takaisin etusivulle
- **📱 Active project highlighting** - valittu projekti näkyy korostettuna
- **🌐 Kielikohtaiset takaisin-napit** - FI: "Takaisin etusivulle", EN: "Back to Home"

### ✅ Mitä on luotu

#### Tiedostorakenne:
```
docs/
├── index.html                          # SPA pääsivu
├── debug.html                          # Debug-työkalut (tableteille)
├── manifest.json                       # Projektien listaus
├── README.md                           # Tämä tiedosto
├── assets/
│   ├── css/
│   │   ├── main.css                    # Perustyyli
│   │   ├── themes-light.css            # Vaalea teema
│   │   └── themes-dark.css             # Tumma teema
│   └── js/
│       ├── debug-logger.js             # Debug-lokitukset
│       ├── theme-manager.js            # Teema/kieli hallinta
│       └── app.js                      # Pääsovellus
└── projects/
    └── indivisible-stochastic-processes/
        └── fi/
            ├── manifest.json           # Projektin tiedostot
            └── documentation/
                └── overview_project.md # Esimerkkisisältö
```

#### Toiminnallisuudet:
- ✅ **Teeman vaihto** (vaalea/tumma) + localStorage tallentaminen
- ✅ **Kielenvaihtaminen** (FI/EN) + localStorage tallentaminen  
- ✅ **Debug-työkalut** tablet-käyttöön
- ✅ **Responsiivinen layout** (desktop + tablet + mobile)
- ✅ **Project manifest** -pohjainen tiedostonhallinta
- ✅ **CDN-kirjastot** valmiina seuraavia vaiheita varten

### 🧪 Testausohjeet

#### 1. Avaa GitHub Pages sivusto
- URL: `https://stochastic-philosophy.github.io/emergent-physics/`
- Tarkista että sivu latautuu ilman virheitä

#### 2. Testaa teeman vaihto
- Klikkaa aurinko/kuu-ikonia yläpalkissa
- Tarkista että teema vaihtuu (vaalea ↔ tumma)
- Päivitä sivu → teeman pitäisi säilyä (localStorage)

#### 3. Testaa kielenvaihtaminen  
- Klikkaa FI/EN-painikkeita yläpalkissa
- Tarkista että teksti vaihtuu
- Päivitä sivu → kielen pitäisi säilyä (localStorage)

#### 4. Testaa debug-työkaluja
- Avaa `debug.html` linkistä
- Kokeile test-painikkeita
- Tarkista että virhelokit näkyvät oikein

#### 5. Avaa selaimen konsoli (jos mahdollista)
- F12 tai oikea klikkaus → "Inspect"
- Tarkista että ei näy JavaScript-virheitä
- Debug-viestien pitäisi näkyä konsolissa

### 🐛 Jos löydät virheitä

#### Debug-työkalut auttavat:
1. **Avaa debug.html** → näet virhelokit tablet-ystävällisesti
2. **Test-painikkeet** → testaa yksittäisiä toimintoja
3. **LocalStorage viewer** → näet tallennetut asetukset
4. **Network monitor** → näet tiedostojen latautumisen

#### Yleisimmät ongelmat:
- **Tiedostopolut**: GitHub Pages on herkkä isoille/pienille kirjaimille
- **CDN-lataus**: Tarkista internet-yhteys
- **Caching**: Pakota refresh (Ctrl+F5 tai Cmd+Shift+R)

### 🚀 Seuraava vaihe (Vaihe 2)

Kun Vaihe 1 toimii luotettavasti, jatkamme:

#### Vaihe 2: Kielenhallinta
- `file-manager.js` → markdown lukeminen ja renderöinti  
- Marked.js + MathJax integraatio
- Automaattinen tiedostolistaus kategorioittain

#### Vaihe 3: Tiedostonhallinta
- Sisällysluettelon generointi
- Categoriat prefixin mukaan
- Fallback-kielen tuki

#### Vaihe 4: Markdown + LaTeX
- Markdown → HTML konversio
- MathJax matematiikka-renderöinti
- Code highlighting (Prism.js)

#### Vaihe 5: Latausfunktiot  
- ZIP-pakkaus (JSZip.js)
- PDF-konversio (jsPDF - rajoitettu)
- Word-konversio (Docx.js - rajoitettu)

### 📋 Tarkistuslista Vaihe 1:lle

Ennen siirtymistä Vaihe 2:een, varmista:

- [ ] **index.html** latautuu ilman virheitä
- [ ] **debug.html** toimii ja näyttää lokiviestejä  
- [ ] **Teeman vaihto** toimii ja tallentuu
- [ ] **Kielenvaihtaminen** toimii ja tallentuu
- [ ] **Mobile/tablet layout** näyttää hyvältä
- [ ] **Console** ei näytä kriittisiä virheitä
- [ ] **Manifest.json** latautuu (Network-välilehdessä)

### 💡 Kehitysvinkkejä

#### Debuggaukseen:
- Käytä **debug.html**:ää tablet-kehitykseen
- Lisää `?debug=true` URL:iin → aktivoi debug-overlay
- LocalStorage:n tyhjentäminen: debug-sivulla "Clear All"

#### Tiedostojen päivitykseen:
- GitHub Pages voi cacheata → **pakota refresh**
- Tiedostonimet: vältä välilyöntejä ja erikoismerkkejä
- JSON-syntaksi: käytä validointityökalua

### 🎮 Kokeile nyt

1. **Copy-pastaa** kaikki tiedostot GitHubiin docs/-kansioon  
2. **Aktivoi GitHub Pages** (Settings → Pages → Source: docs/)
3. **Avaa sivusto** muutaman minuutin kuluttua
4. **Testaa** yllä olevat toiminnot
5. **Raportoi** toimiiko kaikki ennen jatkamista

---

**Vaihe 1 tavoite**: Saada perusrakenne toimimaan luotettavasti ennen monimutkaisempien ominaisuuksien lisäämistä.

**Onnistunut Vaihe 1** = stable foundation joka kestää seuraavat vaiheet! 🚀
