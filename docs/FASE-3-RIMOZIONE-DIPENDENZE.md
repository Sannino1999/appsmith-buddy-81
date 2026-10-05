# Fase 3 — rimozione dipendenze legacy

La Fase 3 rimuove dal percorso applicativo Hostinger le dipendenze legacy di Supabase/PostgreSQL e il gateway AI usato esclusivamente per la traduzione.

## Rimosso

- client browser/server Supabase e middleware di autenticazione Supabase;
- storage di autenticazione per preview Lovable;
- tipi/generated artifacts Supabase;
- configurazione e migrazioni Drizzle/PostgreSQL non più usate;
- driver PostgreSQL;
- `src/lib/translate.server.ts` e il relativo gateway AI Lovable;
- reporting errori Lovable;
- `bun.lock` legacy.

## Mantenuto intenzionalmente

Il webhook Telegram non viene disattivato in questa fase, come stabilito dal piano. Rimane attivo fino alla Fase 5 e continua temporaneamente a usare il gateway Telegram/AI legacy per il parsing dei comandi.

Le sue scritture dati passano esclusivamente dal repository MySQL. Se MySQL non è configurato, il webhook risponde con `503 Database not configured` invece di tornare a Supabase.

## Traduzioni

Il menu non genera più traduzioni dinamiche tramite AI. Per le lingue diverse dall'italiano vengono usate le traduzioni già presenti nella cache `menu_translations` quando l'hash della sorgente coincide; in assenza di una traduzione valida viene mostrato il testo originale.

Questo evita dipendenze AI obbligatorie e impedisce di inventare traduzioni mancanti.

## Database Hostinger

La creazione del database MariaDB/MySQL e l'inserimento delle variabili reali restano operazioni esterne al repository. Il connettore Hostinger disponibile in questa sessione non espone API per amministrare il database dell'hosting Web/Cloud.

Dopo la creazione del database:

```
npm run db:migrate
npm run db:seed
npm run db:verify
```
