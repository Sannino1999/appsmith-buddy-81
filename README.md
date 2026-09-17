# Lubrano Pub & Braceria — menù digitale

## Webhook Telegram sicuro

La ricezione degli aggiornamenti Telegram è implementata nella Supabase Edge Function `telegram-webhook`. La funzione aggiorna esclusivamente `public.menu_overrides` e registra l'operazione in `public.menu_edit_log`. Il frontend ascolta Supabase Realtime sulla tabella `menu_overrides` e invalida la query, quindi il menù si aggiorna senza ricaricare la pagina.

### Secrets necessari

Configurare questi secrets **solo nel progetto Supabase**, mai nel frontend o nei file committati:

- `TELEGRAM_BOT_TOKEN` — token del bot ottenuto da BotFather.
- `TELEGRAM_WEBHOOK_SECRET` — valore casuale lungo usato nell'header del webhook.
- `TELEGRAM_ALLOWED_CHAT_IDS` — ID Telegram autorizzati separati da virgole, ad esempio `123456789,-1001234567890`.
- `SUPABASE_URL` — URL del progetto Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — service-role key, solo server-side.

### Deploy

Da una macchina autenticata con Supabase CLI, dalla root del repository:

```sh
supabase functions deploy telegram-webhook --project-ref ijaclwjfcoxhwxmdviee
```

I secrets non sono inclusi nel comando né nel repository. Impostarli separatamente con `supabase secrets set` solo dopo aver verificato il progetto corretto.

### URL webhook da registrare

Dopo il deploy, l'URL è:

```text
https://ijaclwjfcoxhwxmdviee.supabase.co/functions/v1/telegram-webhook
```

Registrarlo con `setWebhook` usando `secret_token=TELEGRAM_WEBHOOK_SECRET`. Non eseguire la registrazione prima di aver impostato e verificato i secrets.

### Comandi Telegram

- `/start` o `/help`
- `/aggiorna <item_key> prezzo=<valore>`
- `/aggiorna <item_key> descrizione=<testo>`
- `/aggiorna <item_key> disponibile=<si|no>`

Esempio:

```text
/aggiorna burger:0:1 prezzo=12,50
```

`item_key` deve avere il formato stabile `categoria:indice-gruppo:indice-voce`, visibile nel codice dati del menù. Il prezzo è validato con massimo due decimali; la descrizione è limitata a 1000 caratteri.

### Test senza deploy o webhook reale

1. Configurare i secrets nell'ambiente Supabase solo quando si è pronti.
2. Fare il deploy della funzione.
3. Usare `getWebhookInfo` per verificare l'URL registrato.
4. Inviare `/help` dal chat ID autorizzato.
5. Inviare un comando `/aggiorna ...` valido.
6. Verificare la risposta Telegram, la riga in `menu_edit_log`, il record in `menu_overrides` e l'aggiornamento automatico della pagina.
7. Provare un chat ID non autorizzato e un header segreto errato: devono essere rifiutati.

Non sono stati eseguiti deploy, impostazioni di secrets o registrazioni del webhook.

## Development

```sh
npm i
npm run dev
```

Il progetto è stato creato con [Lovable](https://lovable.dev).
