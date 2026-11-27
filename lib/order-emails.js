// Order emails sent through Resend after Stripe confirms a payment.
const { Resend } = require("resend");

const RESEND_KEY = (process.env.RESEND_API_KEY || "").trim();
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Until your own domain is verified in Resend, onboarding@resend.dev can only
// send to the email address on your Resend account.
const FROM = process.env.EMAIL_FROM || "AuraVitae <onboarding@resend.dev>";
const NOTIFY = (process.env.ORDER_NOTIFY_EMAIL || "").trim();
const REPLY_TO = (process.env.EMAIL_REPLY_TO || NOTIFY || "").trim();

const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
const money = (cents) => "$" + ((cents || 0) / 100).toFixed(2);

function orderFromSession(session, products) {
  const md = session.metadata || {};
  const items = Object.keys(products)
    .map((key) => ({ ...products[key], qty: Number(md[key] || 0) }))
    .filter((i) => i.qty > 0);
  const ship =
    (session.collected_information && session.collected_information.shipping_details) ||
    session.shipping_details ||
    null;
  const a = (ship && ship.address) || {};
  const details = session.customer_details || {};
  return {
    id: session.id,
    number: session.id.slice(-8).toUpperCase(),
    email: details.email,
    phone: details.phone,
    name: (ship && ship.name) || details.name || "",
    address: [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" "), a.country]
      .filter(Boolean),
    items,
    subtotal: session.amount_subtotal,
    shipping: (session.shipping_cost && session.shipping_cost.amount_total) || 0,
    tax: (session.total_details && session.total_details.amount_tax) || 0,
    discount: (session.total_details && session.total_details.amount_discount) || 0,
    total: session.amount_total,
    intl: a.country && a.country !== "US",
  };
}

function summaryHtml(o) {
  const row = (l, r, bold) =>
    `<tr><td style="padding:6px 0;${bold ? "font-weight:700;" : "color:#4A5560;"}">${l}</td>` +
    `<td style="padding:6px 0;text-align:right;${bold ? "font-weight:700;" : ""}">${r}</td></tr>`;
  return (
    `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:15px">` +
    o.items.map((i) => row(`${esc(i.name)} × ${i.qty}`, money(i.amount * i.qty))).join("") +
    `<tr><td colspan="2" style="border-top:1px solid #E5E1D8;padding:0"></td></tr>` +
    row("Subtotal", money(o.subtotal)) +
    (o.discount ? row("Discount", "−" + money(o.discount)) : "") +
    row(o.intl ? "International shipping" : "Standard shipping", money(o.shipping)) +
    (o.tax ? row("Tax", money(o.tax)) : "") +
    row("Total", money(o.total), true) +
    `</table>`
  );
}

function wrap(inner) {
  return (
    `<!doctype html><html><body style="margin:0;background:#F6F8F9;font-family:Helvetica,Arial,sans-serif;color:#14202B">` +
    `<div style="max-width:560px;margin:0 auto;padding:32px 20px">` +
    `<div style="background:#FFFFFF;border:1px solid #E5E1D8;border-radius:16px;padding:28px">${inner}</div>` +
    `<p style="text-align:center;font-size:12px;color:#5B6770;margin-top:20px">© ${new Date().getFullYear()} AuraVitae</p>` +
    `</div></body></html>`
  );
}

function customerEmail(o) {
  const html = wrap(
    `<h1 style="margin:0 0 12px;font-size:24px">Thank you for your order${o.name ? ", " + esc(o.name.split(" ")[0]) : ""}</h1>` +
      `<p style="margin:0 0 20px;line-height:1.6;color:#4A5560">We’ve received your payment and are getting your order ready. ` +
      (o.intl
        ? "International orders arrive in 4–7 business days."
        : "Standard shipping arrives in 1–2 business days.") +
      `</p>` +
      `<p style="margin:0 0 8px;font-size:13px;color:#5B6770">Order ${esc(o.number)}</p>` +
      summaryHtml(o) +
      (o.address.length
        ? `<p style="margin:20px 0 4px;font-weight:700">Shipping to</p><p style="margin:0;line-height:1.5;color:#4A5560">${esc(o.name)}<br>${o.address.map(esc).join("<br>")}</p>`
        : "") +
      `<p style="margin:24px 0 0;line-height:1.6;color:#4A5560">Questions about your order? Just reply to this email.</p>`
  );
  return { subject: `Your AuraVitae order ${o.number}`, html };
}

function ownerEmail(o) {
  const html = wrap(
    `<h1 style="margin:0 0 12px;font-size:22px">New order: ${money(o.total)}</h1>` +
      `<p style="margin:0 0 16px;line-height:1.6">${esc(o.name)}<br>${esc(o.email || "")}${o.phone ? "<br>" + esc(o.phone) : ""}</p>` +
      summaryHtml(o) +
      `<p style="margin:20px 0 4px;font-weight:700">Ship to</p><p style="margin:0;line-height:1.5">${esc(o.name)}<br>${o.address.map(esc).join("<br>")}</p>` +
      `<p style="margin:20px 0 0;font-size:12px;color:#5B6770">Stripe session ${esc(o.id)}</p>`
  );
  return { subject: `New order ${o.number}: ${o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}`, html };
}

async function send(kind, to, msg, orderId) {
  const { error } = await resend.emails.send(
    { from: FROM, to: [to], subject: msg.subject, html: msg.html, ...(REPLY_TO ? { replyTo: REPLY_TO } : {}) },
    // Stripe can deliver the same event more than once; this stops duplicate emails.
    { idempotencyKey: `${kind}-${orderId}` }
  );
  if (error) throw new Error(`Resend (${kind} email): ${error.message || JSON.stringify(error)}`);
}

async function sendOrderEmails(session, products) {
  if (!resend) {
    console.warn("Order emails skipped: RESEND_API_KEY not set");
    return;
  }
  const o = orderFromSession(session, products);
  const jobs = [];
  if (o.email) jobs.push(send("customer", o.email, customerEmail(o), o.id));
  if (NOTIFY) jobs.push(send("owner", NOTIFY, ownerEmail(o), o.id));
  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error(r.reason.message));
  if (failed.length) throw new Error(`${failed.length} order email(s) failed`);
}

module.exports = {
  sendOrderEmails,
  emailStatus: () => ({ resend: Boolean(resend), from: FROM, notify: Boolean(NOTIFY) }),
};
