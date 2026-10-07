# Guida Admin — Lubrano Pub

## Accesso

L'area riservata è disponibile su:

- `/admin`

La pagina di login **non mostra il logo**. Il logo viene caricato solo dopo autenticazione, nella console admin.

Le credenziali iniziali vengono create lato server usando le variabili ambiente della Node.js App su Hostinger:

- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`

La password deve contenere almeno 12 caratteri e non superare il limite bcrypt di 72 byte.

### Prima configurazione

1. Apri Hostinger → Node.js App → Environment variables.
2. Imposta `ADMIN_BOOTSTRAP_USERNAME` con lo username scelto.
3. Imposta `ADMIN_BOOTSTRAP_PASSWORD` con una password casuale di almeno 12 caratteri.
4. Riavvia/redeploya la Node.js App.
5. Apri `/admin` e accedi con quelle credenziali.
6. Dopo aver verificato l'accesso, elimina le due variabili di bootstrap e riavvia l'app.

La rimozione delle variabili **non elimina l'utente** già presente nel database: da quel momento l'autenticazione usa l'account salvato in `admin_users`.

## Cambio password dalla pagina

Dopo il login, nella console admin usa la sezione per cambiare password.

È richiesto:

- password attuale;
- nuova password di almeno 12 caratteri;
- nuova password diversa da quella precedente.

La password viene salvata come hash bcrypt; non viene memorizzata in chiaro.

## Password dimenticata / reset

Su Hostinger imposta temporaneamente:

`ADMIN_BOOTSTRAP_RESET_PASSWORD`

Riavvia/redeploya l'app, accedi con la nuova password, poi **rimuovi immediatamente** la variabile e riavvia l'app.

Non lasciare la variabile di reset permanente.

## Sicurezza

La sessione admin è server-side e usa un cookie:

- HttpOnly;
- Secure in produzione;
- SameSite=Lax;
- scadenza automatica.

Sono presenti anche rate limiting dei tentativi di login, controlli di autorizzazione lato server, conferma prima delle modifiche e audit log.

Non inserire mai username, password, cookie, chiavi o segreti nel repository GitHub.

## Dominio consigliato

Per il menu digitale consiglio:

**`menu.lubranopub.com`**

È più pulito di acquistare un secondo dominio solo per il menu e mantiene il brand principale. Le fonti pubbliche attuali riportano `lubranopub.com` come sito del locale.

Configurazione consigliata finale:

- sito/brand: `lubranopub.com`
- menu digitale: `menu.lubranopub.com`
- area riservata: `menu.lubranopub.com/admin`

Per attivarlo bisogna creare il sottodominio `menu` nel pannello DNS/hosting e collegarlo al deployment Hostinger.
