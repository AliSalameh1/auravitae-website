const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// Serve pages and images. "extensions" lets /epimens load epimens.html.
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    maxAge: "1h",
  })
);

// Anything else: show the Posterity home page with a 404 status.
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AuraVitae site running on port ${PORT}`);
});
