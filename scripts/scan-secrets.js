#!/usr/bin/env node
/**
 * Secret scan for committed / staged code.
 * Checks for high-confidence patterns that indicate leaked secrets.
 * Run before push; use in CI. For full scanning use TruffleHog or GitGuardian.
 *
 * Usage: node scripts/scan-secrets.js [path]
 * Exit: 0 = no findings, 1 = potential secret found (block).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const rawScanDir = process.argv[2] || ROOT;
const resolvedRoot = path.resolve(ROOT);
const resolvedScanDir = path.resolve(rawScanDir);
// Restrict scan to repo: only allow SCAN_DIR under ROOT to prevent path traversal
const SCAN_DIR =
  resolvedScanDir === resolvedRoot || resolvedScanDir.startsWith(resolvedRoot + path.sep)
    ? resolvedScanDir
    : ROOT;

// Patterns that strongly suggest a secret (key/value or assignment). Keep generic to reduce false positives.
const PATTERNS = [
  // OpenAI
  { pattern: /sk-[a-zA-Z0-9]{20,}/, name: "OpenAI API key (sk-...)" },
  // JWT (long base64, often Supabase service role or anon)
  { pattern: /eyJ[a-zA-Z0-9_-]{50,}\.eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, name: "JWT (possible service key)" },
  // Generic API key assignments in code (dangerous in client)
  { pattern: /(OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|REVENUECAT_SECRET|REVENUECAT_WEBHOOK_SECRET|LOOPS_API_KEY)\s*=\s*['"][^'"]{20,}['"]/, name: "Hardcoded API key assignment" },
  // Bearer token in source
  { pattern: /Bearer\s+[a-zA-Z0-9_-]{30,}/, name: "Bearer token in source" },
];

const IGNORE_DIRS = new Set(["node_modules", ".expo", "dist", "build", ".git", "ios", "android"]);
const IGNORE_FILES = new Set([".env", "scan-secrets.js", "package-lock.json"]);

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!IGNORE_DIRS.has(e.name)) walk(full, callback);
    } else if (e.isFile() && !IGNORE_FILES.has(e.name)) {
      callback(full);
    }
  }
}

const findings = [];

walk(SCAN_DIR, (file) => {
  const ext = path.extname(file).toLowerCase();
  const allowed = [".ts", ".tsx", ".js", ".jsx", ".json", ".yaml", ".yml", ".md", ".env.example"];
  if (!allowed.some((e) => ext === e || file.endsWith(".env.example"))) return;
  if (file.includes("node_modules")) return;

  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    return;
  }

  const lines = content.split("\n");
  lines.forEach((line, i) => {
    for (const { pattern, name } of PATTERNS) {
      if (pattern.test(line)) {
        findings.push({
          file: path.relative(ROOT, file),
          line: i + 1,
          name,
        });
      }
    }
  });
});

if (findings.length > 0) {
  console.error("Secret scan found potential secrets. Do not commit.\n");
  findings.forEach((f) => console.error(`  ${f.file}:${f.line}  ${f.name}`));
  console.error("\nFix or remove these. Use environment variables / Supabase secrets for keys.");
  process.exit(1);
}

console.log("Secret scan: no high-confidence secrets found.");
process.exit(0);
