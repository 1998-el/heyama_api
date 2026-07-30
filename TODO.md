# Fix Plan ✅

## Issue 1: MongoDB Connection Timeout ✅
- [x] Edit `src/app.module.ts` — Added Mongoose connection timeout options (serverSelectionTimeoutMS: 60000, connectTimeoutMS: 60000, socketTimeoutMS: 90000)

## Issue 2: Duplicate Key Error on Follow (E11000) ✅
- [x] Edit `src/follows/follows.service.ts` — Made `create()` idempotent by catching E11000 duplicate key errors and returning existing follow document instead of throwing

## Issue 3: TypeScript Error — `createdAt` property missing on InteractionEntity ✅
- [x] Edit `src/interactions/schemas/interaction.schema.ts` — Added `createdAt?: Date` and `updatedAt?: Date` to the class (Mongoose timestamps adds them but TypeScript doesn't know about them)
- [x] Edit `src/interactions/interactions.service.ts` — Changed `(i.createdAt as any)?.getTime()` → `(i.createdAt?.getTime() ?? Date.now())` to use proper optional chaining

## Issue 4: Un auteur ne peut pas se suivre lui-même ✅
- [x] Edit `src/follows/follows.service.ts` — Remplacement de la comparaison impossible `followerId === followingId` (UserID vs AuthorID) par `user.authorId === followingId` pour vérifier via l'utilisateur connecté

## Issue 5: Bouton "Suivre" visible sur ses propres articles ✅
- [x] Edit `src/posts/posts.service.ts` — Ajout du flag `isCurrentUserAuthor` dans `userInteraction` retourné par `findOne()`, en comparant `author.userId` (du populated author) avec le `userId` passé en paramètre

## Issue 6: Statut de suivi (isFollowing) non disponible dans les réponses API ✅
- [x] Edit `src/posts/posts.module.ts` — Ajout de `FollowsModule` dans les imports
- [x] Edit `src/posts/posts.service.ts` — Injection de `FollowsService` 
- [x] Ajout de `isFollowing` dans la réponse de `findOne()` (détail d'article)
- [x] Ajout de `isFollowing` pour chaque post dans `findAll()` (feed/liste)
- [x] Création de la méthode privée `enrichWithFollowStatus()` pour enrichir les posts par lot avec les statuts de suivi depuis `FollowsService.getFollowingStatusBatch()`

## Testing
- [ ] Restart the NestJS application: `npm run start:dev` or `nest start --watch`
- [ ] Verify the application compiles without TypeScript errors

