# Heyama API

API REST (NestJS) de gestion d'objets (titre, description, image) avec :

- **Persistance** : MongoDB (Mongoose)
- **Stockage des images** : Backblaze B2 (compatible S3, via AWS SDK), servies par **URLs signées temporaires**
- **Temps réel** : Socket.IO (création / suppression diffusées en direct)

---

## Stack technique

| Domaine        | Technologie                                  |
| -------------- | -------------------------------------------- |
| Framework      | NestJS 10                                    |
| Base de données| MongoDB + Mongoose                           |
| Stockage objet | Backblaze B2 (API S3 compatible)             |
| Temps réel     | Socket.IO                                    |
| Langage        | TypeScript                                   |

---

## Prérequis

- Node.js ≥ 20
- [pnpm](https://pnpm.io/)
- Un cluster **MongoDB** (Atlas ou local)
- Un compte **Backblaze B2** avec une *Application Key* et un bucket

---

## Installation

```bash
pnpm install
cp .env.example .env   # renseigner ensuite vos valeurs dans .env
```

> Le fichier `.env` contient des secrets et **ne doit jamais être commité** (voir `.gitignore`).

---

## Configuration

| Variable              | Description                                                        | Exemple                                  |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `PORT`                | Port de l'API HTTP                                                 | `5000`                                   |
| `SOCKET_PORT`         | Port du serveur Socket.IO (WebSocket)                             | `3001`                                   |
| `MONGODB_URI`         | URI de connexion MongoDB (Atlas ou local)                         | `mongodb+srv://user:pass@cluster...`     |
| `B2_ACCESS_KEY_ID`    | *Application Key ID* B2 (24 caractères, commence par `00…`)       | `0051…0002`                              |
| `B2_SECRET_ACCESS_KEY`| *Application Key* B2 (secrète, à conserver confidentielle)        | `K00…F5w0`                               |
| `B2_BUCKET_NAME`      | Nom du bucket B2                                                    | `heyenastorage`                          |
| `B2_ENDPOINT`         | Endpoint S3 de la région du bucket                                 | `https://s3.us-east-005.backblazeb2.com` |
| `B2_REGION`           | Région B2 correspondant à l'endpoint                              | `us-east-005`                            |
| `B2_PUBLIC_URL`       | URL publique de base du bucket (sert à dériver la clé de l'objet) | `https://f005.backblazeb2.com/file/heyenastorage` |
| `CORS_ORIGINS`        | Origines autorisées (séparées par des virgules)                   | `http://localhost:3000,http://localhost:8081` |

**Notes B2 :**
- L'*Application Key* doit disposer des capacités `readFiles` / `writeFiles` (et `deleteFiles` pour la suppression) sur le bucket cible.
- Le bucket **peut rester privé** : les images ne sont jamais exposées via une URL publique permanente.

---

## Démarrage

```bash
pnpm start:dev     # développement (watch)
pnpm build         # compilation TypeScript
pnpm start:prod    # production (node dist/main)
```

L'API est exposée sur **`http://localhost:5000/api`** et le serveur WebSocket sur **`http://localhost:3001`**.

---

## Endpoints

Toutes les routes sont préfixées par `/api`.

| Méthode | Route               | Body (`multipart`)                         | Description                              |
| ------- | ------------------- | ------------------------------------------ | ---------------------------------------- |
| `POST`  | `/api/objects`      | `title`, `description?`, `image` (fichier) | Crée un objet (l'image est obligatoire)  |
| `GET`   | `/api/objects`      | —                                          | Liste tous les objets (récents d'abord)  |
| `GET`   | `/api/objects/:id`  | —                                          | Détail d'un objet                        |
| `DELETE`| `/api/objects/:id`  | —                                          | Supprime l'objet **et** son image sur B2 |

Exemple de création :

```bash
curl -F "title=Chaise" -F "description=Bois" -F "image=@chaise.png" http://localhost:5000/api/objects
```

> Les champs `imageUrl` retournés par l'API sont des **URLs signées** valides ~1 h, et non l'URL publique brute.

---

## Temps réel (Socket.IO)

Le client se connecte sur `ws://localhost:3001` (port `SOCKET_PORT`). Événements émis par le serveur :

| Événement         | Payload              | Déclenché quand…               |
| ----------------- | -------------------- | ------------------------------ |
| `object-created`  | l'objet créé (signé) | un objet est créé avec succès  |
| `object-deleted`  | l'`id` de l'objet    | un objet est supprimé          |

---

## Stockage des images : B2 + URLs signées

Le bucket B2 peut rester **privé**. Le flux est le suivant :

1. L'upload (`POST /api/objects`) envoie l'image sur B2 et stocke en base l'**URL publique canonique** (`B2_PUBLIC_URL/objects/<fichier>`).
2. À la lecture (`GET`), l'API génère une **URL signée temporaire** (presigned `GetObject`, expirations ~1 h par défaut) à partir de cette clé, et la renvoie à la place de l'URL brute.
3. La suppression (`DELETE`) utilise l'URL stockée pour retrouver la clé et supprimer le fichier sur B2 — elle ne dépend pas des URLs signées.

Implémentation : `src/signed-url/signed-url.service.ts` (génération des URLs signées) et `src/objects/objects.service.ts` (application sur chaque réponse).

---

## Structure du projet

```
src/
├── app.module.ts                # bootstrap des modules
├── main.ts                      # serveur local (app.listen)
├── config/                      # configuration (ConfigModule)
├── objects/                     # module métier (controller, service, schema, dto)
├── upload/                      # UploadService : upload/suppression B2 (S3)
├── signed-url/                  # SignedUrlService : génération d'URLs signées
└── socket/                      # SocketGateway : événements temps réel
api/
└── index.ts                     # handler serverless (Vercel)
```

---

## Tests de connectivité

Un script de diagnostic B2 est fourni (`test.js`) :

```bash
node test.js
```

Il tente de lister les buckets et d'uploader un fichier de test, et affiche `✅ Connexion réussie` en cas de succès.

---

## Déploiement

### Vercel (serverless)

L'API est adaptée pour Vercel via un handler serverless dans `api/index.ts` (démarre `AppModule` sans `app.listen()` et transmet la requête à l'instance Express de Nest).

- Ajoutez les variables d'environnement du `.env` dans les **Environment Variables** du projet Vercel.
- `vercel.json` route l'ensemble de `/` vers la fonction `api/index.ts`.
- Déployez : `vercel --prod`.

> ⚠️ **Limite Vercel** : les fonctions serverless ne permettent pas de connexions WebSocket persistantes. Le `SocketGateway` est donc **désactivé sur Vercel** (`port: undefined`). Le REST API fonctionne normalement ; pour le temps réel, utilisez un hébergeur avec serveur long-lived (voir ci-dessous) ou un mécanisme alternatif (polling / SSE).
>
> ⚠️ Vercel limite la taille du corps des requêtes (~4,5 Mo par défaut) : les uploads d'images volumineuses peuvent échouer sur Vercel.

### Hébergeur avec serveur long-lived (recommandé si WebSocket requis)

Pour garder le temps réel Socket.IO, déployez sur une plateforme qui exécute un serveur Node persistant (Render, Railway, Fly.io, VPS) :

```bash
pnpm build
pnpm start:prod   # node dist/main  (écoute sur $PORT, WebSocket sur $SOCKET_PORT)
```

---

## Notes & sécurité

- Ne commitez jamais le `.env` (clés B2 et mot de passe MongoDB inclus). Il est déjà dans `.gitignore`.
- En production, restreignez `CORS_ORIGINS` aux domaines de votre front-end.
- Les clés B2 doivent être rotationnelles ; révoquez immédiatement toute clé compromise.
- Un `id` invalide (ex. `undefined`) en paramètre de route renvoie `400 Bad Request` plutôt qu'une erreur serveur.
