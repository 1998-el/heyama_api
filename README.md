# Heyema API

API REST (NestJS) de la plateforme de blogging Heyema avec :

- **Persistance** : MongoDB (Mongoose)
- **Authentification** : 100% sociale (Google / Facebook) via JWT
- **Stockage des images** : Backblaze B2 (compatible S3)
- **Temps réel** : Socket.IO (création / suppression diffusées en direct)
- **Engagement** : Likes, commentaires, follows, bookmarks, notifications

---

## Stack technique

| Domaine        | Technologie                                  |
| -------------- | -------------------------------------------- |
| Framework      | NestJS 10                                    |
| Base de données| MongoDB + Mongoose                           |
| Stockage objet | Backblaze B2 (API S3 compatible)             |
| Temps réel     | Socket.IO                                    |
| Authentification| JWT + OAuth Google/Facebook                  |
| Langage        | TypeScript                                   |

---

## Prérequis

- Node.js ≥ 20
- [pnpm](https://pnpm.io/)
- Un cluster **MongoDB** (Atlas ou local)
- Un compte **Backblaze B2** avec une *Application Key* et un bucket
- Comptes Google et Facebook pour OAuth

---

## Installation

```bash
pnpm install
cp .env.example .env   # renseigner ensuite vos valeurs dans .env
```

## Configuration

| Variable              | Description                                                        | Exemple                                  |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `PORT`                | Port de l'API HTTP                                                 | `5000`                                   |
| `SOCKET_PORT`         | Port du serveur Socket.IO (WebSocket)                             | `3001`                                   |
| `MONGODB_URI`         | URI de connexion MongoDB (Atlas ou local)                         | `mongodb+srv://user:pass@cluster...`     |
| `JWT_SECRET`          | Secret pour signer les tokens JWT                                  | `change-me-in-production`                |
| `GOOGLE_CLIENT_ID`    | Client ID Google OAuth                                             | `...`                                    |
| `GOOGLE_CLIENT_SECRET`| Client Secret Google OAuth                                         | `...`                                    |
| `FACEBOOK_CLIENT_ID`  | App ID Facebook                                                    | `...`                                    |
| `FACEBOOK_CLIENT_SECRET`| App Secret Facebook                                               | `...`                                    |
| `B2_ACCESS_KEY_ID`    | *Application Key ID* B2                                           | `0051…0002`                              |
| `B2_SECRET_ACCESS_KEY`| *Application Key* B2                                              | `K00…F5w0`                               |
| `B2_BUCKET_NAME`      | Nom du bucket B2                                                    | `heyenastorage`                          |
| `B2_ENDPOINT`         | Endpoint S3 de la région du bucket                                 | `https://s3.us-east-005.backblazeb2.com` |
| `B2_REGION`           | Région B2 correspondant à l'endpoint                              | `us-east-005`                            |
| `B2_PUBLIC_URL`       | URL publique de base du bucket                                     | `https://f005.backblazeb2.com/file/heyenastorage` |
| `CORS_ORIGINS`        | Origines autorisées (séparées par des virgules)                   | `http://localhost:3000,http://localhost:8081` |

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

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/oauth/google` | Login Google (échange code OAuth) |
| POST | `/api/auth/oauth/facebook` | Login Facebook (échange code OAuth) |
| GET | `/api/auth/session` | Session courante |
| POST | `/api/auth/logout` | Déconnexion |
| PATCH | `/api/auth/me/complete-profile` | Compléter le profil |
| POST | `/api/auth/me/become-author` | Devenir auteur |

### Posts
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/posts/feed` | Feed principal |
| GET | `/api/posts/:slug` | Lire un article |
| GET | `/api/posts` | Liste tous les posts |
| POST | `/api/posts` | Créer un brouillon |
| PATCH | `/api/posts/:id` | Modifier |
| PATCH | `/api/posts/:slug/publish` | Publier |
| DELETE | `/api/posts/:id` | Supprimer |

### Engagement (Likes, Commentaires, Suivre)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/posts/:slug/like` | Liker un article |
| DELETE | `/api/posts/:slug/like` | Enlever un like |
| GET | `/api/posts/:slug/likes` | Voir les likes |
| POST | `/api/posts/:slug/comments` | Commenter |
| GET | `/api/posts/:slug/comments` | Voir les commentaires |
| PATCH | `/api/posts/:slug/comments/:id` | Modifier un commentaire |
| DELETE | `/api/posts/:slug/comments/:id` | Supprimer un commentaire |
| POST | `/api/posts/:slug/comments/:id/like` | Liker un commentaire |
| POST | `/api/follows/:authorId` | Suivre un auteur |
| DELETE | `/api/follows/:authorId` | Ne plus suivre |
| GET | `/api/follows/status/:authorId` | Voir le statut de suivi |

### Bookmarks
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/posts/:slug/bookmark` | Sauvegarder |
| DELETE | `/api/posts/:slug/bookmark` | Supprimer le bookmark |
| GET | `/api/bookmarks` | Liste des bookmarks |

### Notifications
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/notifications` | Liste des notifications |
| PATCH | `/api/notifications/:id/read` | Marquer comme lue |
| PATCH | `/api/notifications/read-all` | Tout marquer comme lu |
| GET | `/api/notifications/unread-count` | Nombre de notifications non lues |

### Analytics (auteurs)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/analytics/me` | Dashboard auteur |
| GET | `/api/analytics/posts/:slug` | Stats d'un article |

### Auteurs
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/authors` | Liste des auteurs |
| GET | `/api/authors/:slug` | Profil d'un auteur |
| GET | `/api/authors/:slug/followers` | Followers d'un auteur |

### Catégories & Tags
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/categories` | Liste des catégories |
| GET | `/api/categories/:slug` | Détail catégorie |
| GET | `/api/tags` | Liste des tags |
| GET | `/api/tags/:slug` | Détail tag |

---

## Stockage des images : B2 + URLs signées

Le bucket B2 peut rester **privé**. Le flux est le suivant :
1. L'upload envoie l'image sur B2 et stocke en base l'**URL publique canonique**.
2. À la lecture, l'API génère une **URL signée temporaire** (~1h).
3. La suppression utilise l'URL stockée pour retrouver la clé et supprimer le fichier sur B2.

---

## Sécurité et modération

- Authentification 100% sociale (pas de gestion de mot de passe)
- JWT avec expiration 7 jours
- Rate limiting recommandé sur :
  - `POST /api/posts/:slug/comments` → 10 req/minute
  - `POST /api/posts/:slug/like` → 50 req/minute
  - `POST /api/auth/*` → 5 req/minute

---

## Tests de connectivité

Un script de diagnostic B2 est fourni (`test.js`) :

```bash
node test.js
```

---

## Déploiement

### Vercel (serverless)

L'API est adaptée pour Vercel via un handler serverless dans `api/index.ts`.

### Hébergeur avec serveur long-lived (recommandé si WebSocket requis)

Pour garder le temps réel Socket.IO, déployez sur Render, Railway, Fly.io ou VPS :

```bash
pnpm build
pnpm start:prod
```

---

## Structure du projet

```
src/
├── app.module.ts                # bootstrap des modules
├── main.ts                      # serveur local (app.listen)
├── config/                      # configuration (ConfigModule)
├── auth/                        # authentification OAuth + JWT
├── users/                       # module utilisateurs
├── authors/                     # module auteurs
├── categories/                  # module catégories
├── tags/                        # module tags
├── posts/                       # module posts + likes + commentaires + bookmarks
├── likes/                       # module likes
├── follows/                     # module suivi d'auteurs
├── bookmarks/                   # module bookmarks
├── notifications/               # module notifications
├── analytics/                   # module analytics
├── upload/                      # UploadService : upload/suppression B2 (S3)
├── signed-url/                  # SignedUrlService : génération d'URLs signées
└── socket/                      # SocketGateway : événements temps réel
api/
└── index.ts                     # handler serverless (Vercel)
```

---

## Notes & sécurité

- Ne commitez jamais le `.env` (clés B2, OAuth et mot de passe MongoDB inclus). Il est déjà dans `.gitignore`.
- En production, restreignez `CORS_ORIGINS` aux domaines de votre front-end.
- Les clés B2 doivent être rotationnelles ; révoquez immédiatement toute clé compromise.
- Un `id` invalide (ex. `undefined`) en paramètre de route renvoie `400 Bad Request` plutôt qu'une erreur serveur.