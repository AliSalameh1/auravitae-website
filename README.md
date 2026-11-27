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
| `/checkout` | `public/checkout.html` | Checkout (sends the cart to Stripe) |
| `/order-success` | `public/order-success.html` | Thank-you page after payment |

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

## Payments (Stripe)

"Place order" sends the cart to `/api/checkout` in `server.js`, which creates a Stripe Checkout session and redirects the customer to Stripe's hosted payment page. Stripe collects the email, phone, shipping address, card and any promotion code. Prices and shipping rates are set in `server.js` (not in the browser).

Railway → service → **Variables**:

| Variable | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Your Stripe secret key. Use `sk_test_…` to test, then `sk_live_…` to sell. |
| `STRIPE_AUTOMATIC_TAX` | Optional. `true` once Stripe Tax is set up in the Stripe dashboard. |

Without `STRIPE_SECRET_KEY`, the checkout shows "Payments aren't set up yet."

Orders appear in the Stripe dashboard under **Payments**. Discount codes are created in Stripe under **Products → Coupons**.
