# MySQL / MariaDB su Hostinger

Questa fase introduce il database MySQL lato server e mantiene `src/data/menu-data.json` come fallback quando MySQL non è configurato.

## Variabili

Impostare solo nell'ambiente server:

- `MYSQL_HOST`
- `MYSQL_PORT` (default 3306)
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_SSL` (opzionale)
- `MYSQL_SSL_REJECT_UNAUTHORIZED` (opzionale, solo se si abilita TLS)

L'applicazione non espone queste variabili al browser.

## Migrazioni

Dopo aver creato database e utente su Hostinger:

```
npm run db:migrate
npm run db:seed
```

Le migrazioni sono in `database/mysql/migrations` e vengono registrate in `schema_migrations`.

## Catalogo

`db:seed` importa le 135 voci dalle stesse regole di chiave usate da `src/lib/menu.ts` nella tabella `menu_catalog_items`.

Il file `src/lib/i18n.ts` viene caricato dallo script per verificare le 7 lingue e le 13 categorie tradotte. Nel repository non è presente un export delle traduzioni dinamiche delle 135 descrizioni; non vengono inventate né trasformate in traduzioni fittizie.

Per importare eventuali traduzioni già salvate in precedenza, creare `seed/menu-translations.json` con:

```json
{
  "items": [
    {
      "item_key": "panini:perfect_burger",
      "lang": "en",
      "name": "Perfect Burger",
      "description": "…",
      "source_hash": "…"
    }
  ]
}
```

Il file può essere aggiunto in seguito senza modificare lo schema.

## Compatibilità

L'hosting Web/Cloud di Hostinger usa MariaDB, mantenendo compatibilità con il protocollo MySQL. Il progetto usa il driver `mysql2` e SQL compatibile con MariaDB.

Le date applicative sono `DATETIME(3)` in UTC, i prezzi sono `DECIMAL(8,2)`, i booleani `TINYINT(1)`. I dati strutturati (`tags`, `details`, `metadata`) sono salvati come testo JSON per evitare dipendenze da differenze tra versioni MariaDB/MySQL. Tutte le tabelle usano `utf8mb4`.

Le query applicative usano placeholder e `execute()`; non viene costruito SQL con input utente.

## Hostinger

Per l'hosting Web/Cloud, Hostinger indica normalmente `localhost` come host per la connessione locale; la porta standard è 3306. I dettagli di database e utente sono visibili in **Websites → Dashboard → Databases Management**. Hostinger permette anche connessioni remote tramite **Remote MySQL**.

Non eseguire queste operazioni prima di aver approvato e mergiato la Fase 2:
1. creare il database;
2. creare o scegliere l'utente MySQL;
3. inserire la password nelle variabili d'ambiente;
4. eseguire `npm run db:migrate`;
5. eseguire `npm run db:seed`.
