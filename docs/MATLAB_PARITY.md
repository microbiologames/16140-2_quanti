# Spécification de parité avec l'application MATLAB

Établie par lecture du source de `VDMA_quanti_v5_1.mlapp` et **vérifiée numériquement**
contre les sorties Excel réelles (voir « Vérification » en fin de document).

C'est ce document, et non la norme, qui définit le comportement attendu de
l'application web : l'objectif est la parité avec l'existant.

## Quelle version fait foi

| Version | Dernière modif. | Rôle |
|---|---|---|
| v4 | 2022-12-08 | ancêtre commun |
| v3_majAmd | 2025-03-27 | **branche d'essai** de l'amendement ISO 16140-2:2016/A1:2024 — abandonnée |
| v5 | 2025-08-27 | ajoute les Bland-Altman par catégorie et les limites d'axe manuelles |
| **v5.1** | **2025-08-28** | **référence** |

`v3_majAmd` est **postérieure** à v4 malgré son numéro : c'est une branche partie de la
v3, pas une étape entre v4 et v5.

**v5.1 et v5 produisent des résultats numériquement identiques.** Le diff ne porte que
sur des haïkus affichés pendant l'attente et un renommage de variable. Aucun calcul ne
change. La question « la dernière est-elle bien la v5.1 ? » n'a donc pas d'incidence sur
le portage : les deux donnent la même chose, et v5.1 est la plus récente.

## La formule des limites

Deux formules coexistent dans l'historique, pour la demi-largeur de l'intervalle autour
du biais moyen `D̄` :

| | Formule | Nature |
|---|---|---|
| **retenue** (v4, v5, v5.1) | `t · SD · √(1 + 1/n)` | intervalle de **prédiction** d'une différence individuelle |
| abandonnée (amendement) | `t · SD / √n` | intervalle de **confiance** sur la moyenne |

avec `t = tinv(0,975 ; n−1)`.

La formule retenue est celle qui correspond à l'usage : on veut encadrer *où tombera la
différence d'un échantillon*, pas *où se situe la différence moyenne*. La seconde produit
un intervalle d'autant plus étroit que l'étude est grande, ce qui classerait en aberrants
d'autant plus d'échantillons qu'on en teste — comportement contraire à l'objectif.

**L'application web implémente la formule retenue.** La formule de l'amendement ne sera
pas implémentée, sauf demande explicite.

## Entrée

Un classeur `.xlsx` à deux onglets.

### Onglet `Data` — une ligne d'en-tête puis une ligne par échantillon

| # | Colonne | Contenu |
|---|---|---|
| 1 | `Year` | année, informatif |
| 2 | `Ech` | numéro d'échantillon |
| 3 | `French` | libellé produit (français), informatif |
| 4 | `English` | libellé produit (anglais), repris dans les tableaux 3 et 5 |
| 5 | `RM(log)` | résultat méthode de référence, log UFC/g |
| 6 | `AM(log)` | résultat méthode alternative, log UFC/g |
| 7 | `Cat` | numéro de catégorie, entier, indexe une ligne de `Classification` |
| 8 | `Typ` | type dans la catégorie : `a`, `b` ou `c` |

### Onglet `Classification` — une ligne par catégorie, sans en-tête

Colonne 1 : nom de la catégorie. Colonnes 2 à 4 : noms des types `a`, `b`, `c`.
Le numéro de ligne **est** la valeur de `Cat`.

## Classement des résultats en cas

Chaque valeur `RM(log)` et `AM(log)` est classée séparément. Les virgules décimales sont
converties en points au préalable.

| Cas | Reconnaissance | Valeur corrigée | Calculs | Graphiques |
|---|---|---|---|---|
| 1 | valeur numérique | telle quelle | ✅ | ✅ |
| 2 | se termine par `*` (< 4 colonies/boîte) | valeur sans le `*` | ❌ | ✅ |
| 3 | commence par `>` (hors limite haute) | valeur **+ 1** log | ❌ | ✅ |
| 3 | commence par `<` (hors limite basse) | valeur **− 1** log | ❌ | ✅ |
| 4 | contient `ND` (trop de colonies) | `NaN` | ❌ | ❌ |

L'ordre de reconnaissance est celui du tableau : le `*` est testé avant `<` et `>`.

**Cas global** de l'échantillon = le plus grand des deux cas, selon l'ordre de gravité
`4 > 3 > 2 > 1` : un échantillon est en cas 4 si l'une des deux méthodes l'est, sinon en
cas 3 si l'une des deux l'est, et ainsi de suite.

### Grandeurs dérivées

- `Ave` = moyenne des deux valeurs corrigées — `NaN` dès qu'une des deux l'est.
- `Dif` = valeur corrigée alternative **moins** valeur corrigée référence.

## Statistiques

**Seuls les échantillons en cas global 1 entrent dans les calculs.** Les cas 2 et 3 sont
tracés sur les graphiques mais exclus des statistiques ; le cas 4 n'est ni tracé ni calculé.

Sur l'ensemble des `Dif` des échantillons en cas 1, globalement puis par catégorie :

```
n   = effectif
D̄   = moyenne des différences
SD  = écart-type des différences (dénominateur n − 1)
t   = quantile de Student à 0,975 et n − 1 degrés de liberté
LCL = D̄ − t · SD · √(1 + 1/n)
UCL = D̄ + t · SD · √(1 + 1/n)
```

Les `LCL` / `UCL` **toutes catégories confondues** servent de seuil d'aberrance pour les
tableaux 5 et 6 — y compris pour les échantillons en cas 2 et 3, qui n'ont pourtant pas
contribué à leur calcul.

## Sorties

### Six familles de figures

| Feuille | Contenu |
|---|---|
| `Plot_cat_<k>` | nuage alternative (Y) vs référence (X), une figure par catégorie, marqueurs par **type** |
| `Plot_allcat` | idem toutes catégories, marqueurs par **catégorie** |
| `Bland Altman` | `Dif` vs `Ave`, toutes catégories, marqueurs par catégorie |
| `Plot_BA_cat_<k>` | idem, une figure par catégorie, marqueurs par **type** |

Conventions communes :

- droite `y = x` (nuages) ou `y = 0` (Bland-Altman), en pointillés noirs ;
- sur les Bland-Altman : biais `D̄` en trait vert, `LCL` et `UCL` en traits rouges,
  calculés **sur le sous-ensemble tracé** (la catégorie pour les figures par catégorie) ;
- cas 2 : cercle orange `rgb(230,126,48)` ; cas 3 : carré jaune ;
- axes des nuages : `[0 , arrondi(max des valeurs corrigées) + 1]`, identiques en X et Y ;
- types `a`/`b`/`c` : losange, carré, triangle — bleu `rgb(84,114,174)`,
  rouge `rgb(164,36,36)`, vert `rgb(112,141,35)` ;
- catégories 1 à 8 : ces trois couleurs puis magenta, olive, rouge, vert, bleu.

Les limites verticales des Bland-Altman par catégorie peuvent être saisies à la main dans
le tableau de l'interface ; `Auto` laisse l'échelle automatique. Cette saisie ne s'applique
**pas** au Bland-Altman global.

### Six tableaux

| Feuille | Contenu |
|---|---|
| `Tableau 1` | effectifs testés et interprétables, par catégorie × type, avec sous-totaux |
| `Tableau 2` | idem, détaillé par cas — ordre des colonnes : cas 1, **4, 2, 3** |
| `Tableau 3` | liste des échantillons non interprétables (cas ≠ 1), triés par catégorie, type, n° |
| `Tableau 4` | par catégorie puis toutes catégories : `n`, `D̄`, `SD`, `LCL`, `UCL` |
| `Tableau 5` | échantillons hors `[LCL, UCL]` globaux, avec valeurs avant correction |
| `Tableau 6` | dénombrement des hors-limites, ventilé par cas et par sens du dépassement |

`Tableau 3` est omis quand tous les échantillons sont interprétables.

## Défauts relevés dans l'application MATLAB

Constatés à la lecture du code. À corriger dans le portage, sauf mention contraire —
chacun sera signalé lors de la reprise pour que la différence de comportement soit un
choix et non une surprise.

### Déclenchés sur les données réelles

1. **Onglet `Classification` réenregistré depuis l'interface.** L'application ajoute deux
   colonnes `Auto` (limites d'axe) au tableau affiché. Si ce tableau est sauvegardé dans
   le fichier d'entrée, la relecture en rajoute deux : les `Auto` du premier
   enregistrement deviennent des **noms de types fantômes**, repris dans les légendes.
   Un fichier du corpus est déjà dans ce cas.

2. **Lecture dépendante du dossier courant.** Le chemin complet du fichier est bien
   calculé, mais la lecture utilise le nom seul.

3. **Nom du fichier de sortie dérivé du nom d'entrée** par recherche de la chaîne
   `Input_` : un fichier nommé autrement produit une sortie au nom tronqué.

4. **Windows et Excel obligatoires.** Les tableaux passent par `xlswrite` et les figures
   par `xlswritefig`, qui pilote Excel en ActiveX. Les figures sont insérées en **EMF**,
   invisible hors Windows. C'est la cause principale de la lenteur.

5. **Feuille `Feuil1` vide** laissée dans chaque classeur de sortie.

6. **Coquilles dans les en-têtes** : « interpretable results *buy* both methods »,
   « *NUmber* of samples ». Corrigées dans le portage.

### Latents — non déclenchés sur le corpus actuel

7. **Valeur non reconnue = arrêt.** Une cellule `RM`/`AM` qui n'est ni un nombre, ni
   `*`, ni `<`, ni `>`, ni `ND` ne correspond à aucune branche : la variable de cas reste
   non affectée et le traitement s'interrompt. Cellule vide comprise.

8. **Légendes décalées si un type ou une catégorie intermédiaire manque.** Les séries ne
   sont tracées que pour les valeurs présentes, mais la légende nomme systématiquement
   les trois types. Si le type `b` est absent alors que `c` est présent, `c` hérite du
   nom de `b`. Deux fichiers du corpus ont une catégorie sans type `c` : le type manquant
   étant le dernier, la légende reste juste — le défaut n'est pas visible aujourd'hui.

9. **Huit catégories au maximum** (tables de couleurs et de marqueurs).

10. **Numérotation de catégories supposée contiguë** et alignée sur les lignes de
    `Classification` : un `Cat` supérieur au nombre de lignes provoque une erreur d'index.

## Vérification

### Parité établie sur les données réelles

`npm run parity -- <dépôt de références>` rejoue chaque fichier d'entrée à travers
l'application et compare les six tableaux produits, **cellule par cellule**, au classeur
correspondant produit par l'application MATLAB.

**Résultat : 8 classeurs sur 8 conformes** — tolérance relative 10⁻⁹, jamais atteinte.

Les seuls écarts restants ne sont pas numériques :

- trois **intitulés de colonnes** dont les coquilles sont corrigées ici
  (« buy both methods », « NUmber ») ;
- six cellules portant le nom d'une catégorie **renommée à la main dans l'interface** au
  moment d'une exécution d'août 2025. Le fichier d'entrée porte toujours le nom
  d'origine : l'écart n'est pas reproductible, et n'a pas à l'être.

Six autres classeurs sont écartés du contrôle — ceux de mars 2025, produits avec la
formule de l'amendement — ainsi que deux classeurs incomplets, issus d'exécutions
interrompues. Le détail de l'appariement figure dans le dépôt privé
(`03_sorties-excel/ANALYSE_APPARIEMENT.md`).

### Deux niveaux de contrôle

Les données de validation ne pouvant pas figurer dans ce dépôt public :

- **En intégration continue** : jeux de données **synthétiques** couvrant tous les cas,
  valeurs attendues calculées indépendamment sous SciPy. Exécutés à chaque modification.
- **Hors intégration continue** : le script `scripts/parity-check.ts` ci-dessus, lancé
  à la main contre le dépôt privé.
