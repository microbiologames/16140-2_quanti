# Fichiers de référence

Le portage s'appuie sur l'application MATLAB d'origine, des jeux de données réels et
les rapports de validation. Rien de tout cela ne vit dans ce dépôt.

**Emplacement :** dépôt privé
[`microbiologames/temp_ISO16140-2-validation-private-references`](https://github.com/microbiologames/temp_ISO16140-2-validation-private-references)

## Pourquoi séparé

Ce dépôt-ci est public — c'est ce qui permet de publier l'application sur GitHub Pages
sans plan payant. Or les références contiennent trois catégories de contenus qui n'ont
rien à faire sur un dépôt public :

- des **données réelles** de laboratoires et de clients ;
- des **rapports de validation** nominatifs ;
- le **texte de l'ISO 16140-2**, sous copyright ISO.

Le dépôt privé règle le problème sans compliquer la publication de l'application.

## Règle de cloisonnement

Rien du dépôt privé n'est recopié ici : ni données, ni extraits de la norme, ni code
MATLAB. Ce qui traverse la frontière, c'est uniquement :

- le **code porté**, réécrit en TypeScript ;
- les **valeurs numériques attendues** des tests de non-régression, dérivées de jeux de
  données **anonymisés ou synthétiques** — jamais de données client ;
- des **références aux numéros de clause** de la norme, ce qui est l'usage normal.

## Organisation

L'arborescence et ce que contient chaque dossier sont décrits dans le README du dépôt
privé. Pour mémoire, par ordre d'utilité au portage :

| Dossier | Contenu |
|---|---|
| `01_application-matlab/` | Le code de l'application d'origine — fait foi sur les calculs |
| `02_fichiers-entree/` | Fichiers de données réels, défauts de formalisme compris |
| `03_sorties-excel/` | Les classeurs MATLAB correspondants — base des tests de non-régression |
| `04_rapports-validation/` | Rapports finaux, pour la mise en forme |
| `05_norme-iso/` | ISO 16140-2 |
| `99_divers/` | Captures, notes, courriels |
