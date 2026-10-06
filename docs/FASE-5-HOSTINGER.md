# Fase 5 — Hostinger

Il deploy rimane su Hostinger. Vercel non è necessario per l'applicazione.

## Primo amministratore

Nel pannello della Node.js App su Hostinger aggiungere temporaneamente:

`ADMIN_BOOTSTRAP_USERNAME` — nome utente scelto da te  
`ADMIN_BOOTSTRAP_PASSWORD` — password casuale di almeno 12 caratteri

La password deve rispettare il limite bcrypt di 72 byte. Non inserirla nel repository.

### Se hai perso la password admin

Puoi mantenere lo username `admin` e impostare temporaneamente `ADMIN_BOOTSTRAP_RESET_PASSWORD` nelle variabili ambiente della Node.js App su Hostinger. Riavvia l'applicazione, accedi con la nuova password, poi **rimuovi subito** `ADMIN_BOOTSTRAP_RESET_PASSWORD` e riavvia di nuovo. La password non viene registrata nei log.

Eseguire un redeploy/restart dell'app. Al primo avvio, se `admin_users` non contiene ancora quell'username, l'app crea l'utente come ruolo `admin` e salva solo l'hash bcrypt.

Dopo avere verificato l'accesso a `/admin`, rimuovere `ADMIN_BOOTSTRAP_USERNAME` e `ADMIN_BOOTSTRAP_PASSWORD` dalle variabili Hostinger e riavviare l'app. L'utente esistente non viene cancellato quando queste variabili vengono rimosse.

## Funzioni admin

La console web usa il database MySQL già collegato:

- login con bcrypt;
- sessione server-side in `admin_sessions`;
- cookie HttpOnly/Secure/SameSite;
- protezione CSRF sulle Server Functions e sull'upload;
- rate limiting dei tentativi di login;
- autorizzazione server-side per ruolo;
- conferma obbligatoria prima delle modifiche;
- audit log senza password Wi-Fi;
- chat privata per amministratore;
- parser deterministico senza AI esterna obbligatoria;
- upload JPG/PNG/WebP massimo 2 MB;
- storico e annulla ultima azione.

## Comandi

Esempi:

`prezzo Perfect Burger 12`

`esaurito patate porchetta`

`disponibile patate porchetta`

`speciale | Burger del mese | Manzo, cheddar e bacon | 14,50 | /uploads/<file>`

`aggiungi categoria | CIBO | Nuova categoria`

`aggiungi piatto | Nuova categoria | Nome piatto | 9,50 | Descrizione`

`wifi | nuova-password`

`storico`

`annulla ultima azione`

In caso di corrispondenza ambigua la console mostra i candidati e non applica la modifica.

## Vercel

Il repository non contiene una configurazione Vercel né uno script di deploy Vercel. Un eventuale check Vercel visibile su GitHub proviene dall'integrazione Vercel collegata all'account/repository, non dal codice.

Per eliminare le notifiche Vercel, scollegare il repository dall'integrazione Vercel nelle impostazioni dell'account Vercel/GitHub. Questo non modifica il deploy Hostinger.
