import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const report = {
  generatedAt: new Date().toISOString(),
  status: "passed",
  checks: [],
  findings: [],
};

const excludedDirectories = new Set([".git", "node_modules", "dist", "coverage", ".wrangler", ".next"]);
const textExtensions = new Set([".html", ".js", ".mjs", ".ts", ".tsx", ".json", ".md", ".css", ".yml", ".yaml", ".txt", ".toml"]);

function record(name, passed, detail) {
  report.checks.push({ name, passed, detail });
  if (!passed) report.status = "failed";
  console.log(`${passed ? "✓" : "✗"} ${name}: ${detail}`);
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) || ["_headers", "robots.txt"].includes(entry.name)) files.push(fullPath);
  }
  return files;
}

const files = walk(ROOT);
const secretPatterns = [
  { name: "private_key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "github_pat", regex: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: "stripe_live_key", regex: /\bsk_live_[A-Za-z0-9]{16,}\b/g },
  { name: "slack_token", regex: /\bxox[baprs]-[A-Za-z0-9-]{16,}\b/g },
  { name: "database_password_url", regex: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s"']+/gi },
  { name: "supabase_service_role_assignment", regex: /(?:SUPABASE_SERVICE_ROLE_KEY|service_role_key)\s*[:=]\s*["'][^"']{20,}["']/gi },
];

for (const file of files) {
  const relative = path.relative(ROOT, file).replaceAll("\\", "/");
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of secretPatterns) {
    const matches = [...content.matchAll(pattern.regex)];
    for (const match of matches) report.findings.push({ type: pattern.name, file: relative, excerpt: match[0].slice(0, 20) + "…" });
  }
}

record("Secret scan", report.findings.length === 0, report.findings.length ? `${report.findings.length} posible(s) secreto(s) detectado(s)` : "sin credenciales privadas detectadas");

function read(relative) {
  const fullPath = path.join(ROOT, relative);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const headers = read("_headers");
record("HSTS", headers.includes("Strict-Transport-Security"), "cabecera HSTS declarada");
record("MIME protection", headers.includes("X-Content-Type-Options: nosniff"), "protección nosniff declarada");
record("Platform no-store", /\/platform\/\*[\s\S]*?Cache-Control:\s*private,\s*no-store/i.test(headers), "plataforma sin caché persistente");
record("Frame protection", headers.includes("X-Frame-Options") || headers.includes("frame-ancestors"), "protección contra framing declarada");

const bootstrap = read("platform/security-bootstrap.js");
record("Temporary session", bootstrap.includes("sessionStorageOnly: true"), "sesión temporal verificada en código");
record("Server rate limit", bootstrap.includes("serverRateLimit: true"), "limitación del servidor verificada en código");
record("Versioned legal acceptance", bootstrap.includes("legalAcceptanceVersioned: true"), "aceptación legal versionada verificada");

const requiredLegal = ["legal/terminos.html", "legal/privacidad.html", "legal/reembolsos.html"];
record("Legal documents", requiredLegal.every((file) => fs.existsSync(path.join(ROOT, file))), "términos, privacidad y reembolsos presentes");

const publicClientFiles = files.filter((file) => [".html", ".js", ".mjs", ".ts"].includes(path.extname(file).toLowerCase()));
const exposedServiceRole = publicClientFiles
  .map((file) => ({ file, content: fs.readFileSync(file, "utf8") }))
  .filter(({ content }) => /service[_-]?role/i.test(content) && !content.includes("SUPABASE_SERVICE_ROLE_KEY") && /eyJ[A-Za-z0-9_-]{20,}\./.test(content));
record("No service-role token in client", exposedServiceRole.length === 0, exposedServiceRole.length ? "posible token privilegiado en cliente" : "sin tokens privilegiados en archivos públicos");

fs.writeFileSync("security-baseline-report.json", JSON.stringify(report, null, 2));
if (report.status !== "passed") {
  console.error("Security baseline failed.");
  process.exit(1);
}
console.log("Security baseline passed.");
