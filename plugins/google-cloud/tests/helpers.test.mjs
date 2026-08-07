import assert from "node:assert/strict";
import { test } from "node:test";
import { inferPathname, parseEnvContent, redact } from "../bin/publish-file.mjs";

test("parseEnvContent handles exports and quoted values", () => {
  assert.deepEqual(
    parseEnvContent(`
# comment
export BLOB_READ_WRITE_TOKEN="abc=123"
OTHER='value'
`),
    {
      BLOB_READ_WRITE_TOKEN: "abc=123",
      OTHER: "value",
    },
  );
});

test("inferPathname uses pathname before prefix", () => {
  assert.equal(inferPathname("/tmp/image.png", { pathname: "/custom/image.png", prefix: "ignored" }), "custom/image.png");
});

test("inferPathname combines prefix and basename", () => {
  assert.equal(inferPathname("/tmp/image.png", { prefix: "/notion-assets/" }), "notion-assets/image.png");
});

test("redact removes token-shaped secrets", () => {
  assert.equal(redact("Bearer abc.def", "abc.def"), "Bearer [REDACTED_SECRET]");
  assert.equal(
    redact("GCP_SERVICE_ACCOUNT_B64=secret", ""),
    "GCP_SERVICE_ACCOUNT_B64=[REDACTED_SECRET]",
  );
});
