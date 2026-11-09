// All data here is invented. "acme-client" stands in for a client name that must never reach the log.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { buildRecord } from "../lib/collect.mjs";
import { contextTerms, redact } from "../lib/redact.mjs";

function fakeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "acme-client-site-"));
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "acme-client-site",
      dependencies: { next: "16.0.0", payload: "3.0.0", bullmq: "5.0.0", "@acme-client/secret-ui": "1.0.0" },
      devDependencies: { typescript: "5.0.0", "@playwright/test": "1.0.0" },
    }),
  );
  fs.mkdirSync(path.join(root, "web", "app", "themes", "acme-theme"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "composer.json"),
    JSON.stringify({ require: { "roots/bedrock": "^1", "acmeclient/private-plugin": "^2", "wpackagist-plugin/woocommerce": "^9" } }),
  );
  fs.writeFileSync(
    path.join(root, "web", "app", "themes", "acme-theme", "package.json"),
    JSON.stringify({ devDependencies: { tailwindcss: "4.0.0", "acme-client-build": "1.0.0" } }),
  );
  return root;
}

function fakeTranscript(root) {
  const lines = [
    { type: "user", timestamp: "2026-11-09T10:00:00Z", message: { role: "user", content: "Fix the slow checkout on acme-client.co.uk and add a test" } },
    {
      type: "assistant",
      timestamp: "2026-11-09T10:05:00Z",
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "Looking at the checkout for acme-client." },
          { type: "tool_use", name: "Edit", input: { file_path: `${root}/src/app/checkout/page.tsx` } },
          { type: "tool_use", name: "Edit", input: { file_path: `${root}/web/app/themes/acme-theme/resources/views/checkout.blade.php` } },
          { type: "tool_use", name: "Write", input: { file_path: `${root}/src/lib/acme-rates.sql` } },
          { type: "tool_use", name: "Bash", input: { command: `cd ${root} && NODE_ENV=test npm run build && git commit -m "fix acme checkout"` } },
          { type: "tool_use", name: "Bash", input: { command: "composer update acmeclient/private-plugin | tail -5; wp cache flush --url=https://acme-client.co.uk" } },
          { type: "tool_use", name: "Read", input: { file_path: `${root}/README.md` } },
        ],
      },
    },
    { type: "assistant", timestamp: "2026-11-09T10:47:00Z", message: { role: "assistant", content: [{ type: "text", text: "Done." }] } },
  ];
  const file = path.join(root, "transcript.jsonl");
  fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join("\n") + "\nnot json\n");
  return file;
}

test("record lists technologies, work kinds and time from the session", () => {
  const root = fakeProject();
  const record = buildRecord({ cwd: root, transcriptPath: fakeTranscript(root), now: new Date("2026-11-09T11:00:00Z") });
  assert.equal(record.edits, 3);
  assert.equal(record.commands, 2);
  assert.equal(record.minutes, 47);
  assert.deepEqual(record.languages, ["Blade", "SQL", "TypeScript"]);
  assert.deepEqual(record.tools, ["Composer", "Git", "WP-CLI", "npm"]);
  assert.deepEqual(record.stack, ["Bedrock", "BullMQ", "Composer", "Next.js", "Payload CMS", "Playwright", "Tailwind CSS", "TypeScript", "WooCommerce"]);
  for (const kind of ["bug fix", "testing", "performance"]) assert.ok(record.kinds.includes(kind), kind);
});

test("record never contains the project, client, paths or private packages", () => {
  const root = fakeProject();
  const record = buildRecord({ cwd: root, transcriptPath: fakeTranscript(root) });
  const serialised = JSON.stringify(record).toLowerCase();
  for (const leak of ["acme", root.toLowerCase(), "checkout", "secret", "private-plugin", ".co.uk", "/src/", "tmp"]) {
    assert.ok(!serialised.includes(leak), `record leaked "${leak}": ${serialised}`);
  }
});

test("a session with no edits or commands is not recorded", () => {
  const root = fakeProject();
  const file = path.join(root, "empty.jsonl");
  fs.writeFileSync(file, JSON.stringify({ type: "user", timestamp: "2026-11-09T10:00:00Z", message: { content: "hi" } }) + "\n");
  assert.equal(buildRecord({ cwd: root, transcriptPath: file }), null);
});

test("a missing transcript is not recorded and does not throw", () => {
  assert.equal(buildRecord({ cwd: "/nonexistent", transcriptPath: "/nonexistent/t.jsonl" }), null);
});

test("redact removes URLs, emails, domains, paths, tokens and project terms", () => {
  const terms = ["acme-client", "acme", "client"];
  const { text, removed } = redact(
    "Fixed Acme checkout on https://shop.acme-client.co.uk for jo@acme.com, see ~/Projects/acme-client/src/x.ts and token ghp_abcdefghijklmnop1234 on 10.0.0.12 via acme-client.co.uk",
    terms,
  );
  assert.ok(removed >= 6, `removed ${removed}`);
  for (const leak of ["acme", "jo@", "Projects", "ghp_", "10.0.0.12", ".co.uk", "http"]) {
    assert.ok(!text.toLowerCase().includes(leak.toLowerCase()), `"${leak}" survived in: ${text}`);
  }
  assert.match(text, /^Fixed \[redacted\] checkout/);
});

test("redact keeps technology names and ordinary words", () => {
  const { text, removed } = redact("Moved image processing to a BullMQ queue in Next.js, cutting CI/CD time by 40%", ["acme"]);
  assert.equal(removed, 0);
  assert.equal(text, "Moved image processing to a BullMQ queue in Next.js, cutting CI/CD time by 40%");
});

test("contextTerms picks up folder names and the git remote owner and repo", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bms-"));
  const project = path.join(root, "globex-portal");
  fs.mkdirSync(project);
  execFileSync("git", ["init", "-q", project]);
  execFileSync("git", ["-C", project, "remote", "add", "origin", "git@github.com:globex-corp/globex-portal.git"]);
  const terms = contextTerms(project);
  for (const t of ["globex-portal", "globex-corp", "globex", "portal"]) assert.ok(terms.includes(t), `missing ${t}: ${terms}`);
});
