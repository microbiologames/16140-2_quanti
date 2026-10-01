# Ressources statiques

| Fichier | Origine |
|---|---|
| `favicon.svg` | Le « A » du logotype ADRIA, isolé et recadré |

Le logotype et la police vivent dans `src/assets/` plutôt qu'ici : Vite ne traite pas le
contenu de `public/`, et ces fichiers doivent pouvoir être intégrés au bundle pour que la
version hors ligne tienne dans un fichier unique.
