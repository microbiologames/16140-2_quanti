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

## Étape 4 — Prévisualisation ✅
- Tableaux à l'écran, organisés comme les onglets du futur classeur.
- Traitement par lot : file d'attente, fichiers lus et analysés en parallèle.
- Les quatre familles de figures, en SVG : nuages par catégorie et toutes
  catégories, Bland-Altman global et par catégorie, avec les marqueurs et les
  couleurs de l'application d'origine, biais et limites tracés, infobulle par point.
- Web Workers : non nécessaires pour l'instant — 2 fichiers de 214 échantillons
  sont lus, analysés et tracés en 0,6 s.

## Étape 5 — Personnalisation ⬅️ *en cours*
- ✅ Habillage aux couleurs ADRIA, Kufam et Arial, logotype discret.
- ✅ Bascule clair / sombre / système, mémorisée.
- ✅ Choix entre la palette de l'application d'origine et une palette validée
  pour la vision des couleurs déficiente, mémorisé et repris à l'export.
- ✅ Résultats en français ou en anglais, au choix — tableaux, figures et classeur.
- Édition des libellés (catégories, types, titres d'axes).
- Sélecteur de couleur par série, à la roue.
- Réglages exportables en preset d'équipe.

## Étape 6 — Export ✅
- Classeur `.xlsx` : les six tableaux mis en forme, une feuille de données, puis
  les figures en PNG à deux fois la résolution d'écran — lisibles partout,
  contrairement aux métafichiers Windows de l'application d'origine.
- Effectifs, totaux, biais, dispersion et limites en **formules Excel**, adossées
  à la feuille de données, avec leur valeur en cache.
- Lot complet en une archive `.zip`, un classeur par fichier d'entrée.
- Un classeur de 214 échantillons, 6 tableaux et 14 figures : 1,2 s.

## Étape 7 — Version hors ligne ✅
- Fichier HTML unique d'environ 1,3 Mo, sans aucune ressource externe : polices,
  logotype, feuille de style et code y sont intégrés.
- Construit en intégration continue et publié à côté du site ; le lien figure
  dans le pied de page de l'application.
- Vérifié de bout en bout en `file://`, export Excel compris.

## Plus tard, éventuellement
- Accès restreint à l'équipe (Pages est public par défaut).
- Export PDF du rapport.
- Comparaison de plusieurs études.
