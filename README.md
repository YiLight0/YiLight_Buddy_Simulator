# Claude Code Buddy Simulator

A small static web simulator inspired by Claude Code's `/buddy` companion flow.
It keeps the terminal-like presentation, the floating companion, the pet warehouse, and the stage view, but it is not a full pet-raising game.

## What It Does

- Draw a new buddy by clicking `Run`
- Keep up to `10` pets in the warehouse
- Avoid duplicate species inside the current warehouse
- Let you switch the active floating companion
- Let you delete pets and free slots for future draws
- Persist state in `localStorage`
- Support `English` and `ÖÐÎÄ`

Current pet data comes from the extracted source files in [`src/data`](./src/data).

## Current UX

- The page opens in English by default
- The input stays disabled and always shows `/buddy`
- The only draw action is clicking `Run`
- The active pet floats near the bottom input area
- The warehouse opens as a two-column desktop panel
- On mobile, the warehouse becomes a list-first flow: tap a pet to open details, then use the back button to return
- The stage lets you place multiple pets and drag them around

## Warehouse Rules

- Max capacity is `10`
- New draws prefer species not already present in the warehouse
- If the warehouse is full, drawing is blocked until you delete one
- Deleting the active pet automatically switches the active companion to another remaining pet when possible

## Tech Stack

- Plain HTML, CSS, and ES modules
- No framework
- A tiny Node static server for local development
- Static deployment friendly, including Vercel

## Run Locally

```powershell
node index.js
```

Then open:

```text
http://127.0.0.1:4173
```

You can also use:

```powershell
npm start
```

Custom port:

```powershell
node index.js --port 5050
```

## Deploy

This project can be deployed as a static site.
The included [`vercel.json`](./vercel.json) keeps `/buddy` working by rewriting it to `/`.

After deployment you can use:

- `https://<your-project>.vercel.app/`
- `https://<your-project>.vercel.app/buddy`

## Scripts

```powershell
npm start
npm run check
```

`npm run check` performs syntax checks for the main JavaScript files.

## Project Files

- [`index.html`](./index.html): app structure
- [`styles.css`](./styles.css): layout and visual styling
- [`app.js`](./app.js): UI logic, pet generation, warehouse, stage, persistence
- [`i18n.js`](./i18n.js): English and Chinese UI text
- [`index.js`](./index.js): local static server
- [`src/data/species.js`](./src/data/species.js): pet profiles
- [`src/data/sprites.js`](./src/data/sprites.js): ASCII sprite data
- [`src/data/types.js`](./src/data/types.js): rarity, stats, and related constants

## Notes

- Browser state is stored in `localStorage`
- Existing `localStorage` data can preserve an older language or UI state until cleared
- This repo currently focuses on the `/buddy` draw flow, warehouse management, and presentation polish rather than deeper gameplay systems
