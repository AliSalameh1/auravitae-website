const express = require("express");
const path = require("path");
const Stripe = require("stripe");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Stripe is only switched on when STRIPE_SECRET_KEY is set (Railway → Variables).
const STRIPE_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const stripe = STRIPE_KEY ? new Stripe(STRIPE_KEY) : null;

// Prices live here on the server so a customer can't change them in the browser.
// Amounts are in cents.
const PRODUCTS = {
  posterity: {
    name: "Posterity",
    description: "90 capsules · Dietary supplement",
    amount: 3999,
    image: "/images/posterity-bottle.png",
  },
  epimens: {
    name: "Epimens",
    description: "60 capsules · Dietary supplement",
    amount: 3999,
    image: "/images/epimens-bottle.png",
  },
};

const SHIPPING = {
  std: {
    display_name: "Standard shipping (United States)",
    amount: 500,
    days: [1, 2],
    countries: ["US"],
  },
  intl: {
    display_name: "International shipping",
    amount: 3000,
    days: [4, 7],
    countries: require("./lib/international-countries.json"),
  },
};

const MAX_QTY = 10;

app.use(express.json({ limit: "10kb" }));

// Quick check that payments are switched on. Never shows the key itself.
app.get("/api/status", (req, res) => {
  const key = (process.env.STRIPE_SECRET_KEY || "").trim();
  res.set("Cache-Control", "no-store");
  res.json({
    payments: Boolean(stripe),
    keyType: !key
      ? "missing"
      : /^(sk|rk)_test_/.test(key)
      ? "test"
      : /^(sk|rk)_live_/.test(key)
      ? "live"
      : "unrecognized (check for extra spaces or quotes)",
    commit: (process.env.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 7) || null,
  });
});

app.post("/api/checkout", async (req, res) => {
  if (!stripe) {
    return res
      .status(503)
      .json({ error: "Payments aren't set up yet. Please try again soon." });
  }

  const body = req.body || {};
  const qty = (v) => {
    const n = Number.parseInt(v, 10);
    return Number.isInteger(n) && n >= 0 && n <= MAX_QTY ? n : 0;
  };
  const quantities = {
    posterity: qty(body.posterity),
    epimens: qty(body.epimens),
  };
  const ship = SHIPPING[body.shipping] ? body.shipping : "std";

  const origin =
    process.env.PUBLIC_URL ||
    `${req.headers["x-forwarded-proto"] || req.protocol}://${req.get("host")}`;

  const line_items = Object.entries(quantities)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => {
      const p = PRODUCTS[key];
      return {
        quantity: n,
        price_data: {
          currency: "usd",
          unit_amount: p.amount,
          product_data: {
            name: p.name,
            description: p.description,
            images: [origin + p.image],
          },
        },
      };
    });

  if (line_items.length === 0) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  const s = SHIPPING[ship];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      shipping_address_collection: { allowed_countries: s.countries },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: s.display_name,
            fixed_amount: { amount: s.amount, currency: "usd" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: s.days[0] },
              maximum: { unit: "business_day", value: s.days[1] },
            },
          },
        },
      ],
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      // Turn on once Stripe Tax is set up in the Stripe dashboard.
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    res
      .status(500)
      .json({ error: "We couldn't start checkout. Please try again." });
  }
});

// Serve pages and images. "extensions" lets /epimens load epimens.html.
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    maxAge: "1h",
    // Pages always re-check with the server so updates show right away;
    // images can still be cached for an hour.
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// Anything else: show the Posterity home page with a 404 status.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `AuraVitae site running on port ${PORT}` +
      (stripe ? "" : " (payments off: STRIPE_SECRET_KEY not set)")
  );
});
