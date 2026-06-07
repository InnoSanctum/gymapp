# Gym Program

Personal 3-day gym program with RU / EN / KA language switcher.

## Tech stack

- React 18
- Vite 5
- No external dependencies (pure inline styles)

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

### Option 1 — Vercel CLI (fastest)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Done — you get a live URL.

### Option 2 — GitHub + Vercel dashboard

1. Push this folder to a GitHub repo
2. Go to https://vercel.com/new
3. Import the repo
4. Framework preset: **Vite** (auto-detected)
5. Build command: `npm run build`
6. Output directory: `dist`
7. Click Deploy

### Option 3 — drag & drop

```bash
npm run build
```

Go to https://vercel.com/new → drag the `dist` folder into the browser. Done.

## Future plans (notes)

- Auth: add Supabase or Clerk for user accounts
- User cabinet: individual programs, progress tracking
- Mobile app: Expo / React Native sharing the same i18n data
- Watch sync: Apple Watch / WearOS via companion app
