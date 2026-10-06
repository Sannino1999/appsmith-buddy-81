# Fase 2 — configurazione Hostinger

Queste istruzioni descrivono le operazioni da eseguire **solo dopo il merge della Fase 2**. In questa fase non viene eseguita alcuna azione sul pannello Hostinger.

## 1. Crea il database

In Hostinger apri **Websites → Dashboard → Databases → Management** e crea un database MariaDB/MySQL dedicato all'applicazione. Conserva in modo sicuro:

- nome database;
- nome utente;
- password;
- host del database.

Per le connessioni locali l'host è normalmente `localhost` e la porta standard è 3306. Hostinger documenta che i piani Web/Cloud usano MariaDB, compatibile con il protocollo MySQL.

## 2. Imposta le variabili dell'app Node.js

Nel pannello dell'app Node.js aggiungi:

```
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=u605125072_lubrano_menu
MYSQL_USER=u605125072_lubrano_admin
MYSQL_PASSWORD=<password-da-inserire-in-hostinger>
```

Non inserirle in GitHub, nel codice o in `.env.example`. Hostinger prevede le variabili d'ambiente nella configurazione della Node.js Web App.

Le variabili legacy di legacy hosting/Supabase/Telegram restano necessarie temporaneamente finché non chiudiamo le Fasi 3 e 5.

## 3. Esegui le migrazioni

Dopo che l'app è stata ridistribuita con la Fase 2, esegui nel metodo di accesso disponibile sul tuo ambiente Node:

```
npm run db:migrate
```

Questo applica solo le migrazioni non ancora registrate in `schema_migrations`.

Subito dopo esegui `npm run db:seed` per importare il catalogo e `npm run db:verify` per controllare automaticamente i numeri attesi.

## 4. Importa il catalogo

Esegui:

```
npm run db:seed
npm run db:verify
```

Lo script controlla che il catalogo contenga esattamente **135 voci e 13 categorie**, quindi importa il catalogo nella tabella `menu_catalog_items` e le traduzioni statiche presenti in `i18n.ts` nella tabella `ui_translations`.

Non vengono inventate le traduzioni dinamiche delle descrizioni delle 135 voci: nel repository attuale non esiste un export statico completo di quelle cache.

## 5. Verifica

Controlla in phpMyAdmin che esistano almeno:

`menu_catalog_items`, `menu_overrides`, `menu_translations`, `menu_edit_log`, `admin_users`, `admin_sessions`, `chat_messages`, `audit_log`, `menu_specials`, `menu_category_overrides`, `menu_custom_categories`, `menu_custom_items`, `ui_translations`, `app_settings`.

Con `MYSQL_*` configurato, il menu pubblico legge il catalogo da `menu_catalog_items`. Se MySQL non è configurato oppure non è raggiungibile, viene usato il catalogo statico come fallback. Questo evita che un database appena creato ma ancora vuoto renda il menu inutilizzabile.

## Note di sicurezza

La password del database va inserita esclusivamente nelle environment variables. Il codice usa query parametrizzate e un pool server-side; le credenziali non vengono inviate al browser.

Per il primo amministratore con password locale non faremo bootstrap automatico in questa Fase 2: l'autenticazione dell'area `/admin` viene costruita nella Fase 5, con password hash e sessioni.

## Bootstrap automatico

L'avvio Node esegue ora un bootstrap idempotente del database. Applica le migrazioni non ancora registrate e importa il catalogo solo quando `menu_catalog_items` è vuota. Non cancella dati esistenti e non ripete il seed a ogni riavvio. Se MySQL non è raggiungibile, l'applicazione continua l'avvio e il menu usa il fallback statico.
