# Fichiers de référence

Dossier de dépôt pour tout ce qui sert à **reproduire fidèlement** l'application MATLAB.
Rien ici n'est utilisé à l'exécution : c'est de la matière première de développement.

## ⚠️ Avant de déposer quoi que ce soit

**Ce dépôt est actuellement PUBLIC.** Tout fichier commité devient visible de tous,
et reste dans l'historique git même après suppression.

Ne déposer ici que des contenus publiables :

| À déposer ici (dépôt public) | À NE PAS déposer dans un dépôt public |
|---|---|
| Jeux de données **anonymisés** ou synthétiques | Données réelles de clients / laboratoires |
| Sorties Excel correspondantes | Rapports de validation nominatifs |
| Code MATLAB, si tu acceptes qu'il soit public | La norme ISO 16140-2 (PDF sous copyright ISO) |

Deux façons de régler ça — voir la discussion dans l'issue de cadrage :
1. passer ce dépôt en **privé** (GitHub Pages depuis un dépôt privé demande un plan payant) ;
2. garder ce dépôt public pour le code, et créer un **second dépôt privé** pour les références.

## Où déposer quoi

### `matlab-app/` — l'application d'origine
Par ordre de préférence :

1. **Le dossier projet complet** (`.m`, `.mlapp`, `.mat`, `.fig`, fonctions utilitaires) — idéal.
2. **Le `.mlapp` seul** — parfaitement lisible : c'est une archive ZIP dont
   `matlab/document.xml` contient l'intégralité du code source de l'app.
3. ~~Le `.exe`~~ — **inutilisable**. Un exécutable MATLAB Compiler embarque le code
   dans une archive CTF chiffrée : le source n'est pas récupérable.

### `input-examples/` — fichiers d'entrée
Idéalement plusieurs, dont :
- un cas « propre » représentatif ;
- un ou deux cas réels avec les **défauts de formalisme** habituels (cellules fusionnées,
  virgule décimale, `<10`, unités dans la cellule, onglets renommés, lignes vides…).
  Ce sont eux qui guideront la robustesse du parseur.

### `output-examples/` — sorties Excel correspondantes
Le `.xlsx` produit par MATLAB **pour chacun des fichiers d'entrée ci-dessus**.
Ils serviront de **tests de non-régression** : les résultats de la nouvelle app
seront comparés numériquement à ceux de l'ancienne.

### `validation-reports/` — rapports finaux
Pour comprendre comment les résultats sont présentés et interprétés en pratique.

### `standard/` — la norme
Utile mais pas indispensable dans l'immédiat : le code MATLAB fait foi.
À ne déposer que si le dépôt est privé (copyright ISO).

## Convention de nommage

Pour que je puisse apparier automatiquement entrées et sorties :

```
input-examples/cas-01-lait.xlsx
output-examples/cas-01-lait.resultats.xlsx
```
