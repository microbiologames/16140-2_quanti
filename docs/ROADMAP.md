# Feuille de route

## Étape 0 — Amorçage ✅
Squelette applicatif, chaîne de build, déploiement GitHub Pages, socle statistique testé,
dépôt privé de références en place ([`REFERENCES.md`](REFERENCES.md)).

## Étape 1 — Rétro-ingénierie de l'application MATLAB ✅
- Source extrait des quatre `.mlapp`, chronologie des versions reconstituée,
  v5.1 identifiée comme référence (v5 et v5.1 sont numériquement identiques).
- Algorithme cartographié dans [`MATLAB_PARITY.md`](MATLAB_PARITY.md) : classement en
  cas, grandeurs dérivées, statistiques, six familles de figures, six tableaux.
- Formule des limites tranchée : intervalle de prédiction, pas l'intervalle de
  confiance de l'amendement abandonné.
- Parité vérifiée numériquement sur les sorties réelles — écart maximal 1,6 × 10⁻¹⁵.
- Tolérances du lecteur spécifiées dans [`INPUT_FORMAT.md`](INPUT_FORMAT.md).

## Étape 2 — Lecture et validation des entrées ✅
- Reconnaissance des onglets `Data` et `Classification`, repérage des colonnes par
  en-tête plutôt que par position.
- Classement en cas 1 à 4 et valeurs corrigées, conformes à `MATLAB_PARITY.md`.
- Normalisations et diagnostics selon `INPUT_FORMAT.md`.

## Étape 3 — Moteur de calcul ✅
- Statistiques et six tableaux portés depuis la v5.1.
- **Parité vérifiée cellule par cellule** sur les classeurs réels : 8 sur 8 conformes
  (`npm run parity`). Seuls subsistent trois intitulés corrigés et un renommage
  manuel non reproductible.
- 119 tests unitaires, valeurs attendues calculées indépendamment sous SciPy.

## Étape 4 — Prévisualisation ⬅️ *en cours*
- ✅ Tableaux à l'écran, organisés comme les onglets du futur classeur.
- ✅ Traitement par lot : file d'attente, fichiers lus et analysés en parallèle.
- Figures : nuages par catégorie et toutes catégories, Bland-Altman global et
  par catégorie.
- Calculs en Web Workers si le volume l'exige — 2 fichiers de 214 échantillons
  prennent aujourd'hui 0,6 s au total, le besoin n'est pas établi.

## Étape 5 — Personnalisation
- Édition des libellés (catégories, types, titres d'axes).
- Sélecteur de couleurs par série.
- Réglages persistés localement et exportables en preset d'équipe.

## Étape 6 — Export
- Classeur `.xlsx` : un onglet par bloc, mise en forme, figures en PNG haute résolution.
- Export du lot complet (un classeur par fichier, ou un classeur consolidé — à décider).

## Plus tard, éventuellement
- Accès restreint à l'équipe (Pages est public par défaut).
- Export PDF du rapport.
- Comparaison de plusieurs études.
