# Format du fichier d'entrée et tolérances du lecteur

Le format nominal est décrit dans [`MATLAB_PARITY.md`](MATLAB_PARITY.md#entrée).
Ce document traite de ce qui arrive quand le fichier s'en écarte.

## Principe

L'application MATLAB s'arrête à la première cellule qu'elle ne comprend pas. La nouvelle
application **ne s'arrête pas** : elle normalise ce qu'elle peut, écarte le reste, et
rend compte de tout ce qu'elle a fait. Trois niveaux :

| Niveau | Effet | Exemple |
|---|---|---|
| **Corrigé** | traité sans intervention, la correction est tracée | `3,07` lu comme `3.07` |
| **Averti** | traité, mais mérite un coup d'œil | catégorie sans aucun échantillon interprétable |
| **Bloquant** | la ligne, l'onglet ou le fichier est écarté, le reste est traité | colonne `AM(log)` absente |

Un fichier qui déclenche des erreurs produit quand même les résultats calculables, avec
la liste de ce qui a été laissé de côté. C'est la différence de fond avec l'existant.

## Ce que contient déjà le corpus réel

Relevé automatique sur les 14 fichiers d'entrée, 2 825 lignes de données. Les deux
séparateurs décimaux **coexistent dans le même corpus** :

| Forme rencontrée | Occurrences |
|---|---|
| `<n,nn` — virgule | 1 121 |
| `n,nn*` — virgule | 348 |
| `<n.nn` — point | 280 |
| `n.nn*` — point | 123 |
| `>n,nn` — virgule | 88 |
| `ND` | 29 |
| `>n.nn` — point | 12 |

À quoi s'ajoutent des colonnes vides en fin d'en-tête sur 4 fichiers, et un onglet
`Classification` réenregistré avec deux colonnes `Auto` parasites sur un fichier.

Autrement dit : le corpus « propre » contient déjà six variantes d'écriture pour la même
information. C'est la meilleure justification du traitement tolérant.

## Normalisations appliquées sans intervention

### Sur les valeurs `RM(log)` et `AM(log)`

| Écart | Traitement |
|---|---|
| virgule décimale | convertie en point |
| espaces en début ou fin, espaces insécables | supprimés |
| valeur stockée en texte alors qu'elle est numérique | convertie |
| `*` précédé d'un espace (`1,30 *`) | espace ignoré |
| `< 1,00`, `> 5,18` | espace après le signe ignoré |
| `≤` et `≥` | traités comme `<` et `>` |
| casse de `ND`, `nd`, `N.D.` | reconnus comme absence de résultat |

### Sur la structure

| Écart | Traitement |
|---|---|
| colonnes en désordre | repérage par en-tête plutôt que par position |
| en-tête accentué, en casse différente, avec espaces | comparaison normalisée |
| colonnes vides en fin de tableau | ignorées |
| lignes entièrement vides | ignorées, la numérotation d'origine est conservée |
| plages fusionnées | valeur rattachée à la cellule maître |
| onglet nommé `data`, `DATA`, `Données` | reconnu |
| deux colonnes `Auto` parasites dans `Classification` | détectées et retirées |
| espaces en bord de libellé de catégorie ou de type | supprimés |
| type noté `A`, `B`, `C` | ramené à `a`, `b`, `c` |

Chacune de ces corrections apparaît dans le rapport de lecture, avec l'emplacement de la
cellule concernée. Rien n'est corrigé en silence.

## Anomalies signalées sans être corrigées

Le traitement continue, mais l'utilisateur doit trancher.

| Anomalie | Conséquence |
|---|---|
| valeur `RM`/`AM` non reconnue | la ligne est écartée des calculs et des graphiques, et listée |
| `Cat` absent de l'onglet `Classification` | catégorie nommée par son numéro |
| catégorie présente dans `Classification` mais sans données | ignorée, signalée |
| type hors `a`/`b`/`c` | conservé comme type supplémentaire, signalé |
| catégorie sans aucun échantillon interprétable | pas de statistiques pour elle |
| moins de 3 échantillons interprétables dans une catégorie | statistiques calculées mais peu robustes ; signalé |
| `RM` et `AM` tous deux hors limites de quantification | valeur corrigée conservée, mais la différence n'a pas de sens ; signalé |
| doublons de numéro d'échantillon | conservés, signalés |
| valeur négative ou supérieure à 12 log UFC/g | conservée, signalée comme improbable |

## Conditions bloquantes

Quand la structure elle-même manque, il n'y a rien à calculer.

| Condition | Portée |
|---|---|
| onglet `Data` introuvable | fichier |
| colonne `RM(log)`, `AM(log)`, `Cat` ou `Typ` introuvable | fichier |
| onglet `Classification` introuvable | les calculs se font, les catégories sont nommées par leur numéro |
| aucun échantillon interprétable | fichier ; les tableaux d'effectifs sont tout de même produits |
| fichier illisible ou vide | fichier |

En traitement par lot, un fichier bloqué n'interrompt pas les autres.

## Cas ambigus — arbitrage à confirmer

Situations pour lesquelles le code MATLAB ne dit rien parce qu'elles le feraient
échouer. Le comportement retenu est indiqué ; il peut être changé.

| Cas | Comportement retenu |
|---|---|
| `<1,00*` — deux marqueurs | `*` prioritaire, comme dans MATLAB ; signalé comme ambigu |
| `>` ou `<` sans valeur | non reconnu, ligne écartée |
| cellule vide dans `RM`/`AM` | traitée comme `ND` (cas 4), signalée |
| `0` en `RM` ou `AM` | valeur légitime, traitée comme telle |
| `Cat` non entier ou nul | ligne écartée |
| plus de 8 catégories | acceptées ; la palette est étendue au lieu d'être bornée |
| types manquants au milieu d'une série | légendes construites depuis les types réellement présents — corrige le défaut n° 8 de MATLAB |

## Ce qui n'est pas couvert

Deux écarts ne sont pas rattrapables automatiquement, et l'application le dira clairement :

- **Inversion des colonnes `RM(log)` et `AM(log)`.** Rien ne distingue les deux séries.
  Le signe du biais serait inversé sans que rien ne le signale.
- **Erreur d'unité** — résultats en UFC/g au lieu de log UFC/g. Détectable seulement par
  vraisemblance : un avertissement est émis si les valeurs dépassent 12, mais un jeu de
  données faibles en UFC/g passerait inaperçu.

Dans les deux cas, seule la relecture humaine protège. Le rapport de lecture affichera
l'étendue des valeurs de chaque colonne pour rendre l'anomalie visible d'un coup d'œil.
