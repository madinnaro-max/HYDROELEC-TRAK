# HydroElec Track

Application **multiplateforme** (Android · iOS · Web) de gestion digitale des dossiers de raccordement **Eau & Électricité** :
les dossiers physiques ne se perdent plus entre le commercial et le technicien de terrain.

- **Offline-first** : tout fonctionne sans réseau (création de dossiers, photos, signature, comptes-rendus) ;
  les modifications partent automatiquement dès que le réseau revient.
- **Sécurisé** : connexion obligatoire par jeton **JWT**, droits par rôle contrôlés *aussi côté serveur*.
- **Lisible au soleil** : blanc pur + bleu océan `#0066FF`, gris anthracite, gros boutons (≥ 54 px).

| Fonctionnalité du cahier des charges | Où c'est dans le code |
|---|---|
| Connexion JWT, rôles Admin / Commercial / Agent technique | `server/auth.js`, `src/context/AuthContext.jsx`, `src/shared/status.js` |
| Fiche agent (matricule, nom, prénom, téléphone, e-mail, rôle) | `src/pages/AgentsAdmin.jsx`, `server/index.js` (`/api/users`) |
| Fiche client (nom, prénom, CIN, adresse, commune / الجماعة) | `src/pages/DossierForm.jsx`, `src/shared/dossierModel.js` |
| Scan / photos du dossier payé + **compression automatique** | `src/components/dossier/AttachmentPicker.jsx`, `src/utils/compressors.js` |
| Statuts 🟡 En cours · 🟢 Traité · 🔴 Clôturé (+ ⚪ Nouveau) | `src/shared/status.js`, `src/components/dossier/StatusBadge.jsx` |
| Hors-ligne + synchronisation automatique | `src/database/db.js`, **`src/database/offlineSync.js`**, `public/sw.js` |
| Carte + navigation GPS (Leaflet / Google Maps) | `src/components/map/*`, `src/hooks/useLocation.js` |
| Signature numérique sur écran | `src/components/dossier/SignaturePad.jsx` |
| Notifications push à l'affectation | `server/push.js`, `src/services/pushService.js`, `public/sw.js` |
| Recherche / filtres (CIN, nom, commune, statut) | `src/shared/dossierModel.js` (`filterDossiers`), `src/pages/DashboardAdmin.jsx` |
| Traçabilité horodatée (création, affectation, clôture…) | `src/components/dossier/HistoryTimeline.jsx` |
| Rapports PDF / Excel | `src/utils/exporters.js`, `src/utils/xlsxWriter.js` |
| CI/CD Android / iOS / Web | `.github/workflows/deploy.yml` |

---

## 1. Configuration multiplateforme : React + Vite + Capacitor

**Un seul code (React) → trois livrables :**

```
                       ┌──────────────► Web / PWA  (GitHub Pages, ou servi par le serveur Node)
 src/ (React + Vite) ──┤                 installable sur Android ET iPhone (« Sur l'écran d'accueil »)
   npm run build       │
        dist/ ─────────┼──► Capacitor ─► Android : projet Gradle → APK / AAB
                       └──► Capacitor ─► iOS     : projet Xcode  → IPA (TestFlight / App Store)
```

- **Vite** compile l'application (`dist/`, chemins relatifs : fonctionne à la racine d'un domaine, dans un sous-dossier GitHub Pages et dans l'appli native).
- **Capacitor** (`capacitor.config.json`) embarque `dist/` dans une coque native (WebView) et donne accès au GPS, aux notifications push, au partage de fichiers.
  Les dossiers `android/` et `ios/` sont **générés** (`cap add`) : ils ne sont pas versionnés, le CI les recrée.
- **Pourquoi pas Flutter ?** Flutter est excellent, mais ici la version **Web/PWA** est un livrable à part entière (aucun
  magasin d'applications nécessaire, mise à jour instantanée) ; avec React une seule base de code sert les trois cibles et
  les photos / IndexedDB / signature / carte Leaflet existent déjà comme briques web éprouvées.
- **Hors-ligne** : sur le web par un *service worker* (`public/sw.js`) ; en natif les fichiers sont dans l'APK/IPA.
  Les **données** sont dans IndexedDB dans les deux cas.

> **iPhone sans Mac ni compte Apple Developer (99 $/an)** : utilisez la version web installée (Safari → Partager →
> *Sur l'écran d'accueil*). Elle fonctionne hors-ligne, utilise GPS et appareil photo, et reçoit les notifications push (iOS 16.4+).
> Un vrai `.ipa` (TestFlight / App Store) exige un Mac + compte Apple Developer — voir §7.

---

## 2. Arborescence

```
hydroelec-track/
├── .github/workflows/deploy.yml   # CI/CD : tests → Web (Pages) + APK Android (+ iOS à la demande)
├── public/
│   ├── favicon.ico
│   ├── icons/                     # icon-192/512, maskable-512, apple-touch-icon (goutte + éclair + dossier)
│   ├── logo.svg
│   ├── manifest.json              # PWA (id unique « hydroelec-track »)
│   └── sw.js                      # service worker : hors-ligne + notifications Web Push
├── assets/                        # sources icône / écran de démarrage pour @capacitor/assets
├── src/
│   ├── assets/styles.css
│   ├── shared/                    # code ISOMORPHE (navigateur ET serveur) : une seule source de vérité
│   │   ├── status.js              #   rôles, statuts, couleurs, transitions autorisées
│   │   ├── dossierModel.js        #   évènements, réducteur, validation, recherche
│   │   └── id.js
│   ├── database/
│   │   ├── db.js                  #   IndexedDB (dossiers, outbox, blobs, meta)
│   │   └── offlineSync.js         #   ★ moteur de synchronisation hors-ligne
│   ├── services/                  # api.js (JWT), dossierService.js (commandes), authService.js,
│   │                              # pushService.js, uploadService.js, platform.js, registerSW.js
│   ├── context/                   # AuthContext, OfflineSyncContext, ToastContext
│   ├── hooks/                     # useOfflineSync, useDossiers, useLocation, useAttachmentUrl, useInstallPrompt
│   ├── components/
│   │   ├── common/                #   Button, Field, Card, Modal, Layout, Logo, SyncBadge, ErrorBoundary
│   │   ├── dossier/               #   DossierCard, StatusBadge, AttachmentPicker/Viewer, SignaturePad, ReportForm, HistoryTimeline
│   │   └── map/                   #   GPSMapView, LocationPicker, GpsButton
│   ├── pages/                     # Login, DashboardAdmin, DossierForm, DossierDetails, TechnicianWorkspace, AgentsAdmin, Profile
│   ├── utils/                     # compressors, exporters (PDF/Excel), xlsxWriter, zipWriter, formatters, fileSaver, diagnostics
│   ├── App.jsx                    # routeur + gardes d'accès par rôle
│   └── main.jsx                   # point d'entrée
├── server/                        # API centrale (Node 22 + Express 5 + SQLite) — voir §6
├── scripts/patch-native.mjs       # permissions Android / iOS après « cap add »
├── tests/                         # node --test (modèle, synchro serveur, Excel)
├── capacitor.config.json · vite.config.js · package.json · .env.example · .gitignore · README.md
```

---

## 3. Comment fonctionne le hors-ligne (le cœur : `src/database/offlineSync.js`)

1. **Tout est un évènement** (`created`, `assigned`, `status`, `report`, `attachment`, `signature`…) avec un identifiant unique généré sur l'appareil.
2. **Écriture locale instantanée** : l'évènement est validé (mêmes règles que le serveur) puis rangé dans la file `outbox` (IndexedDB) **dans une seule transaction** ; l'écran se met à jour tout de suite.
3. **Affichage = dernier état connu du serveur + évènements en attente.** Pas d'écrasement de dossier entier : deux agents hors-ligne sur le même dossier ne se détruisent pas mutuellement.
4. **Retour du réseau** (évènement `online`, retour au premier plan, minuteur 60 s, notification push, bouton) :
   - **PUSH** : envoi des évènements dans l'ordre, par lots ; le serveur applique chaque évènement **une seule fois** (idempotence par id — une réponse perdue ne crée jamais de doublon) et renvoie le dossier à jour ; puis envoi des **photos** une à une.
   - **PULL** : récupération incrémentale par curseur des dossiers modifiés / affectés par d'autres. Un dossier réaffecté à un autre technicien **disparaît** de l'appareil du premier.
5. **Échec réseau** : rien n'est perdu ; nouvel essai avec délai croissant (5 s → 5 min, avec aléa). **Session expirée (401)** : arrêt propre, la file repart après reconnexion.
6. **Refus serveur** (ex. dossier clôturé entre-temps) : l'évènement sort de la file et l'agent voit « Modification refusée par le serveur : … ».
7. **Un agent par appareil** : se connecter avec un autre compte alors que des données ne sont pas envoyées est refusé (aucun mélange).

**Statuts et transitions** (`src/shared/status.js`, appliqués côté appli *et* serveur) :

| De → Vers | Qui |
|---|---|
| Nouveau → En cours | affectation à un technicien (Admin / Commercial) |
| En cours → Traité | le technicien affecté (ou Admin/Commercial) — **au moins un compte-rendu requis** |
| En cours / Traité / Nouveau → Clôturé | Admin / Commercial |
| Traité → En cours, Clôturé → En cours/Nouveau (réouverture) | Admin / Commercial |

> « ⚪ Nouveau » (dossier créé mais pas encore affecté) est ajouté au cahier des charges : sans lui, un dossier sans technicien n'aurait pas d'état.

---

## 4. Mettre en ligne en 10 minutes (un seul lien)

> ⚠ **Ne double-cliquez jamais sur `index.html` du projet.** C'est le gabarit de fabrication (il appelle `/src/main.jsx`) :
> ouvert comme un fichier (`file://…`), il reste bloqué sur « Chargement… » — les navigateurs interdisent ce mode pour une
> application moderne, même compilée. L'application s'ouvre **uniquement par une adresse web `https://…`**, sur l'ordinateur
> comme sur les téléphones.

**Principe** : un seul service héberge l'appli **et** l'API. Vous obtenez *une* adresse (ex. `https://hydroelec-track.onrender.com`)
valable sur tout téléphone ou navigateur, sans réglage côté appli (même origine : pas de CORS, pas de `VITE_API_URL`).

1. **Publiez le dossier sur GitHub** (§4 bis, étape 1 : GitHub Desktop). Un dépôt *privé* convient.
2. **Créez un compte sur https://render.com** (« Sign in with GitHub »). Il demande une carte bancaire : l'offre *Starter*
   (≈ 7 $/mois, plus ≈ 0,25 $/Go/mois de disque — tarifs à vérifier sur le site) est indispensable, car seul un **disque persistant**
   conserve vos dossiers et photos ; une offre gratuite les effacerait à chaque redémarrage.
3. Render → **New + → Blueprint** → choisissez le dépôt : il lit `render.yaml`. Saisissez `ADMIN_PASSWORD` (mot de passe solide
   du compte administrateur) → **Apply**.
4. Attendez la fin du déploiement (5 à 8 min). L'adresse `https://…onrender.com` s'affiche en haut du service.
5. Ouvrez-la : connexion **`ADMIN`** + votre mot de passe → onglet **Agents** → créez les comptes Commercial et techniciens.
6. **Sur chaque téléphone** : ouvrez l'adresse → Android : *Installer l'application* ; iPhone : Safari → Partager → *Sur l'écran d'accueil*.

Ensuite chaque `push` sur `main` redéploie automatiquement. Les données sont dans `/data` (`hydroelec.db` + `uploads/`) : activez les
sauvegardes (snapshots) du disque chez l'hébergeur.
**Autres hébergeurs** (Railway, Fly.io, VPS…) : même image (`server/Dockerfile`, contexte = racine du dépôt), volume monté sur `/data`,
variables `JWT_SECRET`, `ADMIN_PASSWORD`, `NODE_ENV=production`.
**Sans carte bancaire** : GitHub Pages (§4 bis) publie gratuitement l'*appli*, mais les données ont toujours besoin d'un serveur.

---

## 4 bis. CI/CD : site GitHub Pages et APK Android (sans rien installer sur votre PC)

GitHub compile tout (web, APK Android). Il vous faut seulement un compte GitHub et un hébergement pour le **serveur** (§4 ou §6).

### 4.1 Publier le code
1. Installez **GitHub Desktop** (https://desktop.github.com) et connectez-vous.
2. *File → Add local repository…* → choisissez le dossier `HYDROELEC TRAK` → *create a repository* → **Publish repository** (nom conseillé : `hydroelec-track`).
   *(Évitez « Upload files » sur le site GitHub : il oublie les dossiers cachés comme `.github`.)*

### 4.2 Régler le dépôt (une fois)
Dépôt GitHub → **Settings** :
- **Pages** → *Build and deployment → Source* = **GitHub Actions**.
- **Secrets and variables → Actions → Variables** → `VITE_API_URL` = adresse HTTPS de votre serveur (§6), par ex. `https://hydroelec.mon-domaine.ma`.

### 4.3 Récupérer les livrables
Chaque `push` sur `main` lance le workflow (onglet **Actions**) :
- **Site web / PWA** : `https://VOTRE-COMPTE.github.io/hydroelec-track/`
- **APK Android** : dans le run → *Artifacts* → `hydroelec-android-debug-apk` (installable directement : autoriser « sources inconnues »).
- **iOS** : *Actions → Run workflow → cocher « build_ios »* (compilation de contrôle sur macOS, sans signature).

### 4.4 Installer sur les téléphones
- **Android** : ouvrir le lien du site → menu ⋮ → *Installer l'application* ; ou installer l'APK.
- **iPhone** : ouvrir le lien dans **Safari** → Partager → *Sur l'écran d'accueil*.

### 4.5 Signer l'APK de production (facultatif)
```bash
keytool -genkeypair -v -keystore hydroelec.jks -alias hydroelec -keyalg RSA -keysize 2048 -validity 10000
```
PowerShell : `[Convert]::ToBase64String([IO.File]::ReadAllBytes("hydroelec.jks"))` puis ajoutez 4 *secrets* au dépôt :
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. L'artifact `hydroelec-android-release-apk` apparaît alors.
**Conservez précieusement le fichier `.jks`** : sans lui, impossible de publier des mises à jour.

---

## 5. Cloner et compiler en local (Android / iOS)

Prérequis : **Node 22+**, Git. Android : **Android Studio (Otter 2025.2.1+)** et **JDK 21**. iOS : **Mac + Xcode 26+**.

```bash
git clone https://github.com/VOTRE-COMPTE/hydroelec-track.git
cd hydroelec-track
npm install
cp .env.example .env.local        # puis renseigner VITE_API_URL
npm run dev                       # développement : http://localhost:5173
npm test                          # tests (Node, sans dépendance)
npm run build                     # compile dist/
```

### Android
```bash
npm run cap:add:android           # une seule fois : crée android/ et ajoute les permissions
npm run cap:android               # build + sync + ouvre Android Studio
```
Dans Android Studio : *Build → Build Bundle(s) / APK(s) → Build APK(s)* (ou ▶ pour lancer sur un téléphone en mode développeur).
Sans Android Studio : `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.

### iOS (sur Mac)
```bash
npm run cap:add:ios               # une seule fois : crée ios/ et ajoute les descriptions d'usage
npm run cap:ios                   # build + sync + ouvre Xcode
```
Dans Xcode : cible **App → Signing & Capabilities** → choisir votre *Team* ; brancher l'iPhone → ▶.
Pour TestFlight / App Store : *Product → Archive → Distribute App* (compte Apple Developer requis).

Icônes et écran de démarrage natifs : `npm run icons` (sources dans `assets/`).

---

## 6. Serveur central (`server/`)

Node 22 + Express 5 + SQLite (better-sqlite3), JWT HS256, mots de passe **scrypt**. Il sert aussi l'appli web si `dist/` existe.

```bash
cd server
npm install --ignore-scripts      # better-sqlite3 embarque ses binaires : pas de compilateur nécessaire
cp .env.example .env              # renseigner JWT_SECRET (≥ 32 caractères) et ADMIN_PASSWORD
node --env-file=.env index.js     # écoute sur le port 3000
npm test                          # tests d'intégration de l'API (sans ouvrir de port)
```
Au premier démarrage le compte **administrateur** est créé (matricule `ADMIN`, mot de passe = `ADMIN_PASSWORD`, ou généré et affiché dans les journaux).

**Hébergement** (HTTPS obligatoire pour GPS, appareil photo, installation PWA) — le serveur a besoin d'un **disque persistant** (`DATA_DIR`) pour la base et les pièces jointes :
- **Docker** : `docker build -f server/Dockerfile -t hydroelec-track .` puis `docker run -p 3000:3000 -v hydro-data:/data -e JWT_SECRET=… -e ADMIN_PASSWORD=… hydroelec-track`.
- **Render / Railway / Fly.io** : service Docker, *Dockerfile path* `server/Dockerfile`, contexte = racine du dépôt, **volume monté sur `/data`**.
  ⚠ Une offre gratuite *sans disque persistant* efface vos dossiers à chaque redémarrage.
- **VPS** : `docker` + Caddy/Nginx pour le HTTPS.

| Route | Rôle |
|---|---|
| `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/password` | connexion JWT, profil, changement de mot de passe |
| `GET/POST /api/users` · `PATCH /api/users/:id` | gestion des agents (Admin) ; désactivation = sessions révoquées |
| `POST /api/sync/push` · `GET /api/sync/pull?since=` | synchronisation (évènements / dossiers) |
| `PUT/GET /api/attachments/:id` | pièces jointes (contrôle de type, taille, droits) |
| `GET /api/push/config` · `POST/DELETE /api/devices` | notifications |
| `GET /api/health` | supervision |

### Notifications push (facultatif)
Sans configuration, le technicien est quand même prévenu à l'ouverture de l'appli ou au prochain cycle de synchronisation (≤ 60 s, appli ouverte).
- **Web / PWA** : `npx web-push generate-vapid-keys` → variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` du serveur. L'agent touche *Profil → Activer les notifications*.
- **Android natif (FCM)** : projet Firebase → ajouter l'appli Android `com.hydroelec.track` → télécharger `google-services.json` → secret GitHub `GOOGLE_SERVICES_JSON_BASE64` (le CI active alors le push natif) ; *Paramètres du projet → Comptes de service → Générer une clé* → variable serveur `FIREBASE_SERVICE_ACCOUNT_JSON`.
- **iOS natif** : clé APNs à importer dans Firebase + capacités *Push Notifications* dans Xcode (manuel, Mac requis). La PWA iOS installée reçoit le Web Push sans cela.

---

## 7. iOS : les trois chemins

| Chemin | Mac ? | Compte Apple Developer ? | Résultat |
|---|---|---|---|
| **PWA** (Safari → Sur l'écran d'accueil) | non | non | appli plein écran, hors-ligne, GPS, photo, push (iOS ≥ 16.4) |
| **Xcode** sur iPhone branché | oui | non (gratuit, 7 jours) | appli native de test |
| **TestFlight / App Store** | oui (ou CI macOS + certificats) | oui (99 $/an) | distribution aux agents |

Le workflow `ios` compile le projet pour le simulateur **sans signature** (contrôle de bonne santé). Un `.ipa` signé exige vos certificats : ajoutez-les en secrets puis étendez le job (fastlane `match` ou `xcodebuild archive`).

---

## 8. Sécurité et limites connues

- Les droits sont **revérifiés côté serveur** (`server/syncCore.js`) ; l'auteur d'une action vient du jeton, jamais de la requête. Un technicien ne reçoit **que** ses dossiers.
- Désactiver un agent ou changer son mot de passe **révoque ses jetons**. Mais les données déjà présentes sur un téléphone perdu y restent jusqu'à effacement : activez un **verrouillage d'écran** sur tous les appareils (les photos de CIN sont sensibles).
- Sessions : valables `JWT_EXPIRES_IN` (7 j par défaut). Hors-ligne au-delà, l'appli reste utilisable 14 jours ; l'envoi reprend après reconnexion.
- **PDF** : polices latines uniquement — les caractères arabes sont remplacés par « ? » (le fichier **Excel** les conserve).
- **Carte hors-ligne** : seules les tuiles déjà consultées sont gardées ; le GPS, les coordonnées et le bouton *Itinéraire* restent disponibles.
- **iOS Safari (hors PWA installée)** peut purger les données d'un site peu utilisé : installez l'appli sur l'écran d'accueil.
- Pas de synchronisation en arrière-plan quand l'appli est fermée (limite d'iOS) : elle repart à l'ouverture.

## 9. Ce qui a été testé (et ce qui ne l'a pas été)

Garde-fou de démarrage (`index.html`) : testé sur la page ouverte en `file://` (message explicatif) et sur un fichier de script
manquant (la cause réelle est affichée au bout de 8 s au lieu d'un « Chargement… » éternel). Le déploiement Render (`render.yaml`
+ `server/Dockerfile`) **n'a pas pu être exécuté ici** (ni Docker ni compte Render sur le poste de test).

Testé le 10/10/2026 sous Windows avec Node 22.23.3 :
- **Compilation** `npm ci` + `vite build` sur copie propre du dépôt (290 modules) ; le workflow YAML s'analyse sans erreur.
- **24 tests Node** (`npm test` : modèle, droits, transitions, synchronisation serveur, ZIP/Excel) et **7 tests d'intégration de l'API** (`cd server && npm test` : vrai Express, vraie base SQLite, vrais JWT, pièces jointes, révocation, anti force brute).
- **Moteur hors-ligne** (67 contrôles dans un navigateur) : création sans réseau, échec propre, renvoi après réponse perdue sans doublon, refus serveur, réaffectation, session expirée.
- **Parcours complet dans Edge sur le vrai build** : connexion Admin → création → affectation → compte-rendu → export PDF et Excel → connexion technicien → signature → « Traité » (stable sur plusieurs exécutions).
- **Projets natifs** : `cap add android` et `cap add ios` (Capacitor 8) + `scripts/patch-native.mjs` sur les vrais gabarits.

**Non testé** (à valider sur vos appareils) : compilation Gradle / Xcode, notifications push réelles (FCM / Web Push), GPS et appareil photo réels, carte hors-ligne, installation sur un téléphone, image Docker, ouverture du `.xlsx` dans Excel (l'archive ZIP et tous les XML sont bien formés et relus par .NET, mais Excel lui-même n'était pas utilisable sur le poste de test).

Astuce Android local : utilisez le **JDK 21 fourni avec Android Studio** (*Settings → Build Tools → Gradle → Gradle JDK*), pas un Java système plus récent (Gradle 8.14 / AGP 8.13 ne supportent pas Java 26).

## 10. Dépannage

- **« Impossible d'installer l'application »** : *Profil → Lancer le diagnostic* indique ce qui manque (manifeste, icônes 192/512, HTTPS, service worker). Sur Xiaomi/Redmi : autoriser « Raccourcis sur l'écran d'accueil » pour Chrome ; sinon menu ⋮ → *Ajouter à l'écran d'accueil*.
- **Connexion impossible** : écran de connexion → *Paramètres du serveur* → adresse exacte (HTTPS).
- **Rien ne se synchronise** : pastille en haut à droite → touchez-la ; *Profil* affiche la dernière erreur.
- **Tests** : `npm test` ; **diagnostic** : *Profil → Vérifier l'installation*.
