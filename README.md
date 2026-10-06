# Lubrano Pub & Braceria — Menù digitale

Menù digitale multilingua di **Lubrano Pub & Braceria** (Napoli): birre artigianali, burger, focacce e cucina di brace.

Prodotto e realizzato da **DigitGS**.

**App online (Hostinger)**: https://lightpink-magpie-211772.hostingersite.com

## Repository

**GitHub**: https://github.com/Sannino1999/appsmith-buddy-81\n\n## Cosa contiene

- Menù completo (Birre e Food) con categorie, gruppi, prezzi, descrizioni e allergeni.
- Traduzione in 7 lingue (it, en, es, fr, de, pt, zh) con salvataggio delle traduzioni disponibili.
- Ricerca rapida e codice QR da esporre in sala.
- Console amministrativa protetta con comandi deterministici, conferma esplicita, audit log, undo e upload immagini.

## Struttura del progetto

```
src/
  assets/     logo e immagini Lubrano
  components/ componenti dell'interfaccia (QR, UI)
  data/       menu-data.json — menù di base
  lib/        menù, traduzioni, lingue, utilità
  routes/     pagina del menù e webhook Telegram
```

## Sviluppo

Richiede Node.js.

```sh
npm install
npm run dev
```

## Contatti

DigitGS — produttore e manutentore dell'applicazione.
