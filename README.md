# AuraVitae website

A plain HTML/CSS website with a small Node.js (Express) server so it can run on Railway.

## Pages

| URL | File | Page |
| --- | --- | --- |
| `/` | `public/index.html` | Posterity (home) |
| `/epimens` | `public/epimens.html` | Epimens |
| `/posterity-formula` | `public/posterity-formula.html` | Posterity formula + research |
| `/epimens-formula` | `public/epimens-formula.html` | Epimens formula + research |
| `/terms` | `public/terms.html` | Terms & Conditions + Disclaimer (`/terms#disclaimer`) |
| `/checkout` | `public/checkout.html` | Checkout (design only) |

All images are in `public/images/`.

## Run it on your computer

```bash
npm install
npm start
```

Then open http://localhost:3000

## Put it on GitHub

1. Create a new empty repository on github.com (for example `auravitae-website`).
2. In this folder:

```bash
git init
git add .
git commit -m "AuraVitae website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/auravitae-website.git
git push -u origin main
```

(Or use GitHub's "uploading an existing file" link and drag in everything from this folder.)

## Deploy on Railway

1. On railway.app, choose **New Project → Deploy from GitHub repo** and pick the repository.
2. Railway detects Node.js, runs `npm install`, then `npm start`. No settings needed — the server uses Railway's `PORT` automatically.
3. Under **Settings → Networking**, click **Generate Domain** for a railway.app link, or **Custom Domain** to connect your own domain (e.g. auravitaenutritions.com) and add the DNS record Railway shows you.

## Still to fill in

- Prices, shown as `[$PRICE]`, and shipping times `[X–X]` — search the HTML files for `[` to find every placeholder.
- FAQ answers that say `[Answer]`.
- **Checkout does not take payments yet.** The form is a design. To sell, connect a payment provider — e.g. Stripe Checkout / Payment Links, or Shopify Buy Buttons — and point the "Place order" / "Get started" buttons at it.
