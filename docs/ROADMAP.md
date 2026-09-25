# Feuille de route

## Étape 0 — Amorçage ✅
Squelette applicatif, chaîne de build, déploiement GitHub Pages, socle statistique testé,
dossiers de dépôt des références.

## Étape 1 — Rétro-ingénierie de l'application MATLAB ⬅️ *bloqué : en attente des fichiers*
- Extraire et lire le source du `.mlapp` / des `.m`.
- Cartographier : quels blocs d'analyse, quelles formules, quelles règles d'acceptabilité,
  quelles figures, quelle organisation des onglets de sortie.
- Rédiger `docs/INPUT_FORMAT.md` et `docs/MATLAB_PARITY.md` (correspondance fonction par fonction).

## Étape 2 — Lecture et validation des entrées
- Parseur tolérant : virgule décimale, cellules fusionnées, espaces insécables,
  colonnes déplacées, onglets renommés, valeurs censurées (`<10`, `>300`), lignes vides.
- Rapport de diagnostic : ce qui est bloquant, ce qui est corrigé automatiquement (et comment),
  ce qui mérite un coup d'œil.

## Étape 3 — Moteur de calcul
- Un module par bloc d'analyse, porté depuis MATLAB.
- **Tests de non-régression** : pour chaque fichier d'entrée de référence, comparaison
  numérique avec la sortie MATLAB correspondante. C'est le critère de « même fonctionnalité ».

## Étape 4 — Prévisualisation
- Tableaux et figures à l'écran, organisés comme les onglets du futur classeur.
- Traitement par lot : file d'attente de fichiers, un worker chacun, navigation entre résultats.

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
