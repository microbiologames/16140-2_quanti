# ISO 16140-2 — Méthodes quantitatives

Application web d'interprétation des données brutes d'études de validation de méthode
selon l'**ISO 16140-2** (volet *méthodes quantitatives*).

Elle remplace une application MATLAB existante, avec les mêmes calculs mais :

- **100 % navigateur** — aucune donnée n'est envoyée sur un serveur, tout est calculé en local.
- **Traitement par lot** — plusieurs fichiers d'entrée en une seule passe.
- **Prévisualisation** — figures et tableaux visibles *avant* le téléchargement.
- **Personnalisation** — libellés de catégories/types éditables, couleurs choisies à la roue.
- **Export Excel** — un classeur `.xlsx` avec un onglet par bloc de résultats, figures incluses.

> Statut : **moteur de calcul opérationnel**. Les six tableaux de l'étude sont produits
> et leur parité avec l'application MATLAB est vérifiée cellule par cellule sur les
> classeurs réels — 8 sur 8 conformes. Restent à faire les figures et l'export Excel.

## Démarrer en local

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # tests unitaires (Vitest)
npm run build        # build de production dans dist/
```

Contrôle de parité avec l'application MATLAB, contre le dépôt privé de références :

```bash
npm run parity -- /chemin/vers/temp_ISO16140-2-validation-private-references
```

## Déploiement

Chaque push sur `main` déclenche le workflow [`deploy.yml`](.github/workflows/deploy.yml)
qui publie sur GitHub Pages.

Pour l'activer, une seule fois : **Settings → Pages → Build and deployment → Source : GitHub Actions**.

URL une fois activé : `https://microbiologames.github.io/16140-2_quanti/`

## Documentation

| Fichier | Contenu |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Choix techniques et structure du code |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Étapes de développement |
| [`docs/MATLAB_PARITY.md`](docs/MATLAB_PARITY.md) | L'algorithme à reproduire, et la vérification de parité |
| [`docs/INPUT_FORMAT.md`](docs/INPUT_FORMAT.md) | Format d'entrée et tolérances du lecteur |
| [`docs/REFERENCES.md`](docs/REFERENCES.md) | Où vivent les fichiers de référence, et pourquoi ailleurs |
