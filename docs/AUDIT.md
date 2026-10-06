# Audit tecnico — Lubrano Pub & Braceria

Data: 6 ottobre 2026  
Target: Hostinger Node.js / MySQL  
Repository: Sannino1999/appsmith-buddy-81

## Stato consolidato

- Il repository GitHub è la sorgente del codice.
- Il logo originale è servito da `/public/lubrano-logo.png`.
- Il frontend usa un template Lubrano riutilizzabile con palette bordeaux/rosso, nero/wine, mint e crema.
- La build è configurata per Node.js 22 e Nitro `node-server`.
- L'app usa MySQL lato server; nessun segreto viene committato.

## Fase 4 — Menù pubblico

- Logo originale locale.
- Ricerca globale accessibile.
- Categorie dinamiche, speciale, servizi, Wi-Fi e venue CTA.
- Layout responsive.
- Immagini locali con fallback controllati.
- Design system documentato in `docs/LUBRANO-DESIGN-SYSTEM.md`.

## Fase 5 — Admin e sicurezza

- Login con password hashata tramite bcrypt.
- Sessioni server-side con token casuale memorizzato come hash.
- Cookie HttpOnly, Secure e SameSite=Lax; cookie `__Host-` in produzione.
- CSRF per server functions e upload.
- Ruoli viewer/operator/admin verificati server-side.
- Rate limit login per processo.
- Comandi deterministici con Zod e conferma obbligatoria.
- Audit log e undo.
- Upload immagini: 2 MB, allowlist MIME, firma binaria, nome casuale e scrittura non sovrascrivibile.
- Le immagini degli speciali accettano esclusivamente file locali sotto `/uploads/`.

## PWA

- Manifest e service worker locali.
- Cache offline limitata alla pagina pubblica `/` e asset pubblici.
- Nessuna cache per `/admin`, API o server functions.
- Registrazione solo dopo hydration e su HTTPS/localhost.
- Cache versionata per aggiornamenti deterministici.

## CI

È in preparazione un singolo workflow CI per Node 22 che esegue installazione da lockfile, test admin, typecheck, build, audit delle dipendenze di produzione e scansione dei riferimenti legacy. I vecchi workflow per fase vengono eliminati per evitare esecuzioni duplicate e auto-commit concorrenti.

## Rischi residui

- `npm audit` va verificato nel runner con advisory database aggiornato.
- Il rate limit in memoria va spostato su storage condiviso se si usano più processi.
- Le credenziali MySQL e admin devono essere configurate esclusivamente in Hostinger.

## Riferimenti

- Frontend Hostinger: https://lightpink-magpie-211772.hostingersite.com
- GitHub: https://github.com/Sannino1999/appsmith-buddy-81
