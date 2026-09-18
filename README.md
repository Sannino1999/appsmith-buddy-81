# Lubrano Pub & Braceria — Menù digitale

Menù digitale multilingua di **Lubrano Pub & Braceria** (Napoli): birre artigianali, burger, focacce e cucina di brace.

Prodotto e realizzato da **DigitGS**.

**App online**: https://lubranopub.lovable.app

## Cosa contiene

- Menù completo (Birre e Food) con categorie, gruppi, prezzi, descrizioni e allergeni.
- Traduzione automatica in 7 lingue (it, en, es, fr, de, pt, zh) con salvataggio delle traduzioni.
- Ricerca rapida e codice QR da esporre in sala.
- Bot Telegram per gli operatori: modifica prezzi, descrizioni e disponibilità in linguaggio naturale, con registro delle modifiche.

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
