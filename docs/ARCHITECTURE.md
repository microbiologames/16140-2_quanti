# Architecture

## Contrainte fondatrice : GitHub Pages = hébergement statique

GitHub Pages ne sert que des fichiers statiques — pas de serveur, pas de Python, pas de MATLAB
Runtime. **Tout le calcul se fait donc dans le navigateur.**

Ce n'est pas qu'une contrainte, c'est un avantage ici :

- les données de validation **ne quittent jamais le poste** de l'utilisateur (rien n'est téléversé) ;
- pas de serveur à maintenir, à payer, ni à sécuriser ;
- latence nulle : le recalcul après un changement de paramètre est instantané.

## Pile technique

| Besoin | Choix | Pourquoi |
|---|---|---|
| UI | **React 19 + TypeScript** | Typage strict sur les structures de données métier ; écosystème connu de Claude Code, donc facile à faire évoluer |
| Build | **Vite** | Build statique rapide, sortie directement publiable sur Pages |
| Styles | **Tailwind CSS v4** | Itération rapide sur des vues très tabulaires |
| État | **Zustand** | Store minimal, sans cérémonie |
| Lecture / écriture Excel | **ExcelJS** | Lit et écrit `.xlsx`, et surtout **sait insérer des images** dans une feuille — indispensable pour exporter les figures |
| Lecture CSV | **PapaParse** | Tolérant aux séparateurs et encodages douteux |
| Figures | **ECharts** | Rendu canvas rapide, export PNG haute résolution (`getDataURL`), thème et couleurs pilotables à chaud |
| Tests | **Vitest** | Tests numériques de non-régression vs. sorties MATLAB |
| Calcul lourd | **Web Workers** | Un worker par fichier → le traitement par lot est réellement parallèle et l'UI reste fluide |

### Note sur SheetJS

`xlsx` (SheetJS) est le lecteur de référence, mais la version publiée sur npm est figée
en 0.18.5 et porte des vulnérabilités corrigées uniquement sur le CDN de l'éditeur.
On s'en passe : **ExcelJS** couvre la lecture `.xlsx` et l'écriture riche.
Si un jour il faut lire du `.xls` *legacy* (Excel 97-2003), on réévaluera.

## Structure du code

```
src/
  core/        types métier, registre des modules, orchestration du pipeline
  io/          lecture des fichiers d'entrée, écriture du classeur de sortie
  stats/       fonctions statistiques (distributions, régression, ANOVA) — testées
  modules/     un module par bloc d'analyse ISO 16140-2
  ui/          composants d'affichage
  state/       store applicatif
```

## Le pipeline

```
Fichier(s)
   ↓  io/readWorkbook      lecture brute, tolérante
   ↓  core/parse           reconnaissance de la structure, normalisation
   ↓  core/validate        diagnostics : erreurs bloquantes vs. avertissements
   ↓  modules/*            calcul, par module d'analyse
   ↓  ui                   prévisualisation : tableaux + figures, éditables
   ↓  io/writeWorkbook     export .xlsx, un onglet par bloc, figures incluses
```

Chaque étape produit des **diagnostics** plutôt que de planter : un fichier imparfait
donne un résultat partiel accompagné de la liste de ce qui n'a pas été compris.
C'est la réponse au point « robustesse au formalisme ».

## Un module d'analyse

Chaque bloc de résultats est un module autonome qui déclare ce dont il a besoin et
ce qu'il produit. Ajouter un bloc = ajouter un fichier dans `src/modules/`, sans toucher
au reste. Les modules à porter seront déterminés par lecture du code MATLAB
(a priori : étude de linéarité, justesse relative, profil d'exactitude, étude
interlaboratoires — **à confirmer**).

## Séparation calcul / présentation

Un module renvoie des **données** (nombres, séries, verdicts), jamais du rendu.
Les libellés, l'ordre des catégories et les couleurs vivent dans un objet de
présentation distinct, modifiable dans l'UI et réinjecté aussi bien dans les figures
à l'écran que dans l'export Excel. C'est ce qui rend l'édition des noms et des couleurs
possible sans recalculer quoi que ce soit.
