const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

// jwks-rsa 4.1.0 synchronously requires ESM-only JOSE from two CommonJS
// entrypoints. Vercel's runtime loader can reject require(esm).
// Keep the installed version and load JOSE when the async code uses it.
// Upstream: https://github.com/auth0/node-jwks-rsa/pull/508
const adminRequire = createRequire(require.resolve("firebase-admin/auth"));
const entry = adminRequire.resolve("jwks-rsa");
const root = path.dirname(path.dirname(entry));
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (version !== "4.1.0") {
  throw new Error("Review the jwks-rsa compatibility patch for installed version " + version);
}

function patch(file, adapt) {
  const target = path.join(root, file);
  const original = fs.readFileSync(target, "utf8");
  if (original.includes("await import('jose')")) return;
  const detached = original.replace(/^const jose = require\('jose'\);\r?\n/, "");
  const updated = adapt(detached);
  if (detached === original || updated === detached) {
    throw new Error("Unexpected jwks-rsa source layout: " + file);
  }
  fs.writeFileSync(target, updated);
}

patch("src/utils.js", source => source.replace(
  "async function retrieveSigningKeys(jwks) {",
  "async function retrieveSigningKeys(jwks) {\n  const jose = await import('jose');",
));
patch("src/integrations/passport.js", source => source.replace(
  "return function secretProvider(req, rawJwtToken, cb) {",
  "return async function secretProvider(req, rawJwtToken, cb) {\n" +
  "    let jose;\n" +
  "    try { jose = await import('jose'); } catch (error) { return cb(error); }",
));
