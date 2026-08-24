# LD Patka

Angular 21 web app for Lovačko društvo Patka — same features as the Android app. Installable on phone and desktop.

## Run

```bash
cd Lovacki/app
npm start
```

Open http://localhost:4200

## Production (installable, offline)

```bash
npm run build
npx http-server -p 8080 -c-1 dist/app/browser
```

Then open http://localhost:8080 and install from the browser.

## Accounts

- Default admin: `admin` / `patka1946`
- Members: Create a club account
- Admin code on register: `LDADMIN`

Stands reset every day at 12:00 Europe/Zagreb. Data is stored in the browser (`localStorage`).
