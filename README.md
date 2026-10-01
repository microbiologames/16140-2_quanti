# ISO 16140-2 — Méthodes quantitatives

Application web d'interprétation des données brutes d'études de validation de méthode
selon l'**ISO 16140-2** (volet *méthodes quantitatives*).

Elle remplace une application MATLAB existante, avec les mêmes calculs mais :

- **100 % navigateur** — aucune donnée n'est envoyée sur un serveur, tout est calculé en local.
- **Traitement par lot** — plusieurs fichiers d'entrée en une seule passe.
- **Prévisualisation** — figures et tableaux visibles *avant* le téléchargement.
- **Deux langues** — résultats en français ou en anglais, au choix, sans service externe.
- **Personnalisation** — thème clair/sombre, deux palettes ; libellés éditables à venir.
- **Export Excel** — un onglet par bloc, figures incluses, et les calculs en **formules**
  plutôt qu'en valeurs figées.

> Statut : **chaîne complète**. Lecture, calcul, tableaux, figures, export Excel avec
> formules, résultats en français ou en anglais. La parité avec l'application MATLAB est
> vérifiée cellule par cellule sur le corpus de référence — 42 classeurs comparables
> sur 43.

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

## Version hors ligne

L'application ne fait **aucun appel réseau** : lecture des fichiers, calculs, figures et
export ont tous lieu dans le navigateur. Elle tient donc dans un fichier HTML unique,
d'environ 1,3 Mo, que l'on ouvre d'un double-clic sans rien installer.

Le lien de téléchargement est en bas de l'application en ligne, ou en construction locale :

```bash
npm run build:standalone    # produit dist-standalone/ISO16140-2-quanti.html
```

Tout y fonctionne à l'identique — le fichier est d'ailleurs vérifié de bout en bout en
`file://`, export Excel compris. Trois choses à savoir :

- **Elle ne se met pas à jour toute seule.** Le pied de page affiche sa date de
  construction, et renvoie vers la version en ligne.
- **Les préférences** (thème, palette, langue) sont mémorisées par le navigateur et
  peuvent ne pas l'être pour un fichier local, selon sa configuration. L'application
  fonctionne sans.
- **Elle se partage comme un fichier** : copie sur un disque réseau, pièce jointe, clé USB.

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
