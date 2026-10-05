# Audit tecnico — Fase 0

Data: 5 ottobre 2026

Baseline analizzata: `cefd6b7` (`Saved photo to menu`) su `main`
Branch di audit: `fase-0-audit`

## Vincoli e conflitti rilevati

Sono stati letti `AGENTS.md`, `README.md` e `roadmap.md` prima dell'audit.

`AGENTS.md` richiede di mantenere Lovable Cloud come livello delle modifiche live e di servire le fotografie mediante Lovable Assets. Questo confligge con l'obiettivo esplicito del piano di migrare a Hostinger/MySQL e rimuovere Lovable nelle fasi successive. Per le fasi 1-7 il piano dell'utente deve quindi prevalere; non è stata applicata alcuna modifica a tale file in questa fase.

## A. Stack, versioni, comandi e configurazione di runtime

### Stack attuale

- Frontend SSR: React `19.2.0`, TanStack Router `1.170.18`, TanStack Start `1.168.32`, React Query `5.101.1`.
- Build: Vite `8.1.5`, Tailwind CSS `4.2.1`, TypeScript `5.8.3` in modalità strict.
- Server: Nitro `3.0.260603-beta`; Drizzle Kit `0.31.10` e Drizzle ORM `0.45.2` sono presenti solo come strumenti di migrazione.
- Database attuale: PostgreSQL/Supabase tramite `@supabase/supabase-js` `2.116.0` e driver `postgres` `3.4.9`.
- Il progetto dichiara `@types/node` `^22.16.5`, ma non dichiara `engines.node`; la verifica locale è stata eseguita con Node `24.19.0` incluso nell'ambiente, non con Node 22 di Hostinger.

### Comandi dichiarati in `package.json`

- `dev`: `vite dev`
- `build`: `vite build`
- `build:dev`: `vite build --mode development`
- `preview`: `vite preview`
- `lint`: `eslint .`
- `format`: `prettier --write .`

Non esistono script `typecheck`, `test` o `start`. In particolare, non c'è un comando di avvio Node esplicito per Hostinger.

### Nitro / deploy

`vite.config.ts` dipende da `@lovable.dev/vite-tanstack-config` e punta l'entry SSR a `src/server.ts`. Il commento del pacchetto indica che Nitro usa Cloudflare come target predefinito; la build effettiva lo conferma con `preset: cloudflare-module`. L'output prodotto è quindi un worker Cloudflare (`.output/server/wrangler.json`), non una configurazione Node/Nitro verificata per Hostinger. Questo è un rischio di compatibilità da stabilizzare prima del deploy su Node 22.

Sono presenti sia `package-lock.json` sia `bun.lock`; non è indicato quale package manager sia canonico. Il file `bunfig.toml` fa riferimento anche a pacchetti Lovable.

## B. Stato dell'implementazione

### Già implementato e verificato nel repository

- Catalogo statico in `src/data/menu-data.json`: 2 macro-categorie, 13 categorie e 135 voci (conteggio eseguito durante l'audit).
- Menu pubblico in `src/routes/index.tsx`, con logo, sfondo locale `src/assets/menu-bg.jpg` (circa 168 KB), cambio lingua, QR code, ricerca nella categoria attiva, orari, telefono e link indicazioni.
- Etichette UI, categorie e tag in sette lingue in `src/lib/i18n.ts`.
- Livello dati server per override, categorie dinamiche, voci extra e speciale del mese in `src/lib/menu.functions.ts`; contiene un fallback al catalogo statico quando Supabase non risponde.
- Traduzione runtime delle singole voci, con cache Supabase, attraverso l'AI gateway Lovable.
- Webhook Telegram con amministratori autorizzati, bootstrap code, audit log e modifica guidata dal modello AI.
- CSRF middleware per le server function TanStack e una pagina di errore SSR.
- Il codice contiene RLS e policy per PostgreSQL; i dati pubblici sono leggibili anonimamente, mentre le operazioni amministrative usano la service role sul server.

### Implementato solo in parte o non collegato alla UI

- `getLiveMenuData` legge override categorie, categorie custom, voci custom e speciale, ma `index.tsx` chiama soltanto `getOverrides`. Speciale del mese, categorie/voci dinamiche e relativa disponibilità non vengono quindi mostrati al pubblico.
- `i18n.ts` traduce etichette e tassonomia; non contiene le traduzioni complete delle 135 descrizioni. Le traduzioni delle voci sono oggi generate a runtime e cacheate in Supabase.
- URL per Google Reviews, Instagram, WhatsApp e testi Wi-Fi/allergeni sono definiti in `i18n.ts`, ma la pagina non li rende.
- Il menu apre con gli identificativi obsoleti `beer` e `ale`, mentre i dati usano `food`/`drinks` e `stuzzicheria`/altre categorie. All'avvio non esiste una categoria attiva e non vengono mostrati prodotti: è un difetto funzionale visibile.
- La ricerca è limitata alla categoria corrente e non annuncia i risultati con `aria-live`.
- Le pillole hanno già hover e focus visibile nello stylesheet; l'interfaccia non implementa ancora tutti i requisiti responsive/accessibili della Fase 4.

### Non presente

- Rotta `/admin`, login, utenti amministratori locali, sessioni, ruoli, limitazione tentativi, upload, chat, parser deterministico, annullamento o test automatici.
- Manifest, icone PWA, service worker e istruzioni di installazione.
- Connessione MySQL, schema Drizzle effettivo, seed/import del catalogo, script di start Node per Hostinger.
- Test framework e test di unità/integrati.

## C. Dipendenze da servizi esterni e sostituzione proposta

### Lovable

- `package.json` e `vite.config.ts`: `@lovable.dev/vite-tanstack-config` gestisce plugin, ambienti e Nitro con target Cloudflare. Va sostituito da configurazione Vite/TanStack/Nitro esplicita compatibile con Node 22/Hostinger.
- `AGENTS.md`, `.lovable/` e `bunfig.toml`: metadati e istruzioni dell'ecosistema Lovable. Vanno aggiornati/rimossi soltanto quando la migrazione sarà completa e concordata.
- `src/assets/*.asset.json`: riferimenti a `/__l5e/assets-v1/...` e storage R2 Lovable; `index.tsx` usa il logo verticale tramite uno di questi manifest. Per Hostinger vanno sostituiti con file immagine effettivi versionati o caricati in storage controllato dall'app.
- `src/lib/lovable-error-reporting.ts` e `src/routes/__root.tsx`: inviano errori a hook globali Lovable. Sostituzione: logging server-side standard e, se necessario, un provider di osservabilità scelto dal proprietario.
- `src/integrations/supabase/previewAuthStorage.ts`: broker postMessage per preview Lovable. Non ha ruolo su Hostinger e va rimosso con il client Supabase.
- `src/integrations/supabase/cron-auth.ts`: usa segreti cron Lovable; al momento non è importato. Da rimuovere oppure sostituire solo se verrà introdotto un cron Hostinger.

### Supabase / PostgreSQL

- `src/integrations/supabase/client.ts`, `client.server.ts`, `auth-attacher.ts`, `auth-middleware.ts`, `types.ts`: client browser/server, auth bearer e tipi generati. Il client browser è caricato globalmente da `src/start.ts`; il client server viene usato da menu e webhook. Sostituzione: un modulo MySQL solo server-side, cookie di sessione propri e autorizzazione applicativa lato server.
- `src/lib/menu.functions.ts`: legge/scrive direttamente tabelle Supabase in `getOverrides`, `getLiveMenuData` e `translateCategory`. Sostituzione: repository/query parametrizzate MySQL, con fallback statico mantenuto finché il DB non è configurato.
- `src/routes/api/public/telegram/webhook.ts`: persiste amministratori, override e log in Supabase. Finché il webhook resterà attivo, dovrà passare al repository MySQL; la sua disattivazione resta successiva alla Fase 5 come richiesto.
- `supabase/` e `drizzle/migrations/`: SQL e configurazione PostgreSQL. Sostituzione: una sola catena di migrazioni MySQL versionate.

### Telegram e AI

- `src/routes/api/public/telegram/webhook.ts`: invia messaggi tramite `connector-gateway.lovable.dev/telegram`, usando credenziali Telegram incapsulate da Lovable. Sostituzione futura: disattivazione dopo la Fase 5; non si introduce Telegram nella nuova architettura.
- Lo stesso webhook chiama `ai.gateway.lovable.dev` con `google/gemini-3.8-flash` per interpretare comandi. Fase 5 lo sostituirà con un parser deterministico, separato e testato.
- `src/lib/translate.server.ts` chiama `ai.gateway.lovable.dev` con `openai/gpt-6-astra` per tradurre le voci. Va rimosso in Fase 3, mantenendo solo le traduzioni disponibili senza rendere l'AI obbligatoria.

## D. Database e migrazioni esistenti

`drizzle/schema.ts` è vuoto, benché `drizzle.config.ts` punti a PostgreSQL. Esistono inoltre due sorgenti di migrazione divergenti: `drizzle/migrations/` definisce le otto tabelle, mentre `supabase/migrations/` crea soltanto le prime quattro e poi revoca grant. Non esiste un seed del catalogo statico.

### Otto tabelle PostgreSQL attuali

- `menu_overrides`: `item_key` text PK, nome/descrizione/prezzo opzionali, `available` boolean default true, `updated_at` timestamptz.
- `menu_translations`: PK composta (`item_key`, `lang`), nome/descrizione opzionali, `source_hash`, `created_at` timestamptz.
- `menu_edit_log`: `id` UUID con `gen_random_uuid()`, attore, azione, item opzionale, `details` JSONB default `{}`, data.
- `telegram_admins`: `chat_id` bigint PK, username e nome/cognome opzionali, data.
- `menu_specials`: UUID, titolo obbligatorio, descrizione/prezzo/immagine/item opzionali, `active`, data.
- `menu_category_overrides`: `category_id` text PK, nome opzionale, `available`, data.
- `menu_custom_categories`: id text PK, `macro` vincolato a `food` o `drinks`, nome, ordinamento, `active`, data.
- `menu_custom_items`: UUID, `item_key` univoco, `category_id`, nome obbligatorio, descrizione/prezzo, `available`, data; indice su `category_id`.

### Adattamento necessario a MySQL

- Rimuovere lo schema `public`, grant Supabase e RLS/policy: MySQL non offre l'equivalente. Il database deve esporre un solo utente applicativo con privilegi minimi e il controllo di lettura/scrittura va applicato nel server Node.
- Convertire `timestamptz` in `DATETIME(3)` gestito in UTC, `numeric(8,2)` in `DECIMAL(8,2)`, boolean in `TINYINT(1)`/`BOOLEAN` e JSONB in `JSON`.
- Generare UUID nel server e salvarli in `CHAR(36)` (o adottare binary UUID con conversione esplicita); `gen_random_uuid()` non è disponibile.
- Riscrivere upsert PostgreSQL (`ON CONFLICT`) come `INSERT ... ON DUPLICATE KEY UPDATE` e verificare gli indici univoci equivalenti.
- Verificare la versione MySQL di Hostinger prima di usare check constraint o default JSON; il seed deve passare valori espliciti quando necessario.
- Consolidare tutto in un solo schema Drizzle MySQL e una sola cronologia di migrazioni; aggiungere in Fase 2 `admin_users`, sessioni, `chat_messages` e `audit_log` oltre alle otto tabelle.

Per la password Wi-Fi modificabile non esiste una tabella esistente né una tabella elencata nel piano Fase 2; occorre concordare se aggiungere una piccola tabella impostazioni, ad esempio `app_settings`, o includere il dato in una struttura già prevista.

## E. Variabili d'ambiente attualmente lette

Solo nomi, senza valori:

- `LOVABLE_DB_MIGRATION_URL`
- `LOVABLE_API_KEY`
- `LOVABLE_CRON_SECRET`
- `LOVABLE_CRON_SECRET_PREVIOUS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `TELEGRAM_API_KEY`
- `TELEGRAM_BOOTSTRAP_CODE`

Non è presente `.env.example`. Una scansione dei file tracciati per pattern di token comuni non ha rilevato valori reali; non sostituisce una rotazione preventiva di eventuali credenziali già usate su servizi esterni.

## F. Rischi di sicurezza e affidabilità

- Il webhook Telegram verifica l'header segreto con confronto a tempo costante, quindi non è privo di verifica come ipotizzato nel contesto iniziale. Tuttavia il segreto è derivato dalla stessa API key del bot e non è un segreto webhook dedicato; mancano rate limit, protezione replay e limite esplicito al body.
- Tutti gli amministratori Telegram possono abilitare altri amministratori. Non esistono ruoli separati né revoca, e le modifiche AI vengono applicate subito senza conferma esplicita.
- Il parser AI accetta la risposta del modello senza validazione schema o vincoli di dominio: prezzo, disponibilità e item devono essere validati lato server prima di ogni mutazione.
- `translateCategory` è esposto come server function pubblica: può generare chiamate AI e scritture cache con una service role senza rate limit. È un rischio di costo e di abuso.
- Il server usa una service role Supabase per letture pubbliche e mutazioni amministrative. La RLS protegge oggi il database, ma la futura architettura MySQL richiede controlli di permesso server-side equivalenti e testati, non una semplice migrazione SQL.
- Mancano login, sessioni HttpOnly, CSRF per le future rotte admin, limitazione tentativi, validazione upload e audit append-only: sono requisiti della Fase 5, non presenti oggi.
- Le immagini logo dipendono da endpoint Lovable non pubblicati come file locali: su Hostinger possono risultare 404 o non essere cacheabili come previsto.
- Il preset Nitro costruisce per Cloudflare, non per Hostinger Node. In produzione potrebbe non esistere un entrypoint Node avviabile.
- Il menu parte in uno stato incoerente (`beer`/`ale`) e non mostra voci; è un rischio funzionale immediato.
- La configurazione ha lockfile multipli, nessun `engines` e nessuno script test/typecheck: la riproducibilità e il controllo qualità sono deboli.

## G. Verifiche eseguite

Comandi lanciati sul clone del branch `fase-0-audit`. L'ambiente non disponeva di `node`/`npm` nel PATH; è stato usato il runtime Node incluso dall'app. Non sono state eseguite azioni su Hostinger.

- Install: **non riuscito**. `npm ci` non era eseguibile perché `npm` non è disponibile. Il tentativo alternativo `pnpm install --lockfile=false` ha materializzato le dipendenze ma termina con `ERR_PNPM_IGNORED_BUILDS` per gli script di `esbuild`; non deve essere considerato un'installazione pulita. I file temporanei di lock generati sono stati rimossi e non sono parte della PR.
- Lint: **non riuscito**. Esecuzione diretta di ESLint: 491 problemi (484 errori, 7 warning), in prevalenza regole Prettier su file esistenti; sono presenti anche warning React Hooks/Fast Refresh.
- Typecheck: **riuscito**. `tsc --noEmit` termina con codice 0.
- Build: **riuscita**. `vite build` termina con codice 0, ma segnala: plugin `vite-tsconfig-paths` superfluo, `createServerFn().inputValidator()` deprecato, chunk client di circa 598 KB sopra la soglia 500 KB e preset Nitro `cloudflare-module`.

La build riuscita non certifica il runtime Hostinger Node 22: è stata effettuata con Node 24.19.0 e genera target Cloudflare.

## H. Piano proposto per le fasi 1-7

Le quantità indicano una stima dei file coinvolti, non un impegno a modificare tutto in una singola PR.

### Fase 1 — Stabilizzazione (circa 8-12 file)

- Correggere configurazione build/start per Nitro Node su Hostinger, aggiungere `engines`, script `typecheck` e `.env.example` senza valori.
- Eliminare il blocco lint più evidente e le regressioni runtime non comportamentali; documentare gli avvisi rimanenti.
- Verificare install con il package manager scelto, lint, typecheck e build su Node 22.

### Fase 2 — MySQL (circa 12-18 file)

- Introdurre modulo database server-only, schema/migrazioni MySQL consolidate e repository con query parametrizzate/UTF-8 `utf8mb4`.
- Creare le 8 tabelle adattate, `admin_users`, sessioni, `chat_messages`, `audit_log` e la soluzione concordata per le impostazioni Wi-Fi.
- Aggiungere seed/import per 135 voci, categorie e traduzioni disponibili; mantenere fallback statico.
- Preparare istruzioni Hostinger senza creare DB o impostare variabili.

### Fase 3 — Rimozione dipendenze (circa 10-15 file)

- Rimuovere client Supabase, storage preview, telemetry Lovable e gateway AI delle traduzioni; preservare le stringhe/traduzioni esportate disponibili.
- Convertire i lettori dati al repository MySQL e rendere l'app indipendente dagli asset Lovable.
- Conservare temporaneamente il webhook Telegram, trasferendone la persistenza a MySQL, fino alla sostituzione prevista in Fase 5.

### Fase 4 — Menù pubblico (circa 7-12 file più asset ottimizzati)

- Collegare `getLiveMenuData`, correggere stato iniziale CIBO/Stuzzicheria, implementare speciale, servizi, Wi-Fi, allergeni, ricerca globale/accessibile e responsive.
- Localizzare o ottimizzare le immagini e verificare contrasto, `srcset`/`sizes` e layout su tre breakpoint.

### Fase 5 — Admin e chat (circa 18-28 file)

- Aggiungere rotte `/admin` e API protette, auth con hash password, sessioni cookie, CSRF, rate limit, autorizzazione e upload limitati.
- Creare parser deterministico e test per parser/permessi, chat con conferma, audit, storico e undo.
- Sostituire il flusso Telegram/AI e solo dopo disattivare il webhook nel codice.

### Fase 6 — PWA (circa 8-12 file più icone)

- Manifest, icone, service worker prudente, cache offline del menu pubblico e segnali chiari per l'admin offline.
- Aggiungere guida di installazione Android/iPhone.

### Fase 7 — Collaudo e pubblicazione (circa 5-9 file/documenti)

- Eseguire checklist funzionale, test di sicurezza e build pulita; verificare catalogo e flusso modifica-prezzo al pubblico.
- Consegnare istruzioni passo passo per variabili e dominio Hostinger, senza applicare alcuna modifica esterna.

## Informazioni da chiarire prima delle fasi successive

- Conferma che il piano di migrazione a Hostinger/MySQL prevale sulle istruzioni Lovable presenti in `AGENTS.md`.
- Fornisci o indica dove ottenere gli originali locali dei loghi attualmente referenziati solo come Lovable Assets.
- Per conservare davvero le traduzioni delle 135 voci: esiste un export delle righe cache in `menu_translations`, oppure va mantenuta solo la traduzione delle etichette già presente nel repository?
- Autorizzi una tabella impostazioni dedicata per password Wi-Fi e altri valori non di catalogo, dato che non è inclusa nell'elenco della Fase 2?
- Prima della Fase 2 serviranno i parametri non segreti del database Hostinger (host, porta, database, utente, versione MySQL) e la scelta del flusso iniziale per il primo amministratore; non devono essere inviati password o token in chat/repository.
