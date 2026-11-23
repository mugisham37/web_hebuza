// Design guardrails (THEME-MIGRATION-PLAN §5). Usage: node scripts/check-design.mjs [--paths dir1,dir2 | --paths dir1 dir2]
//  1. legacy colour names in classes      2. rounded-* other than none/full; rounded-full only on circles
//  3. raw hex outside the allow-list        4. low-contrast gold/sky text on light, white text on gold
//  5. more than one bg-grad-* per file (warning)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const argv = process.argv.slice(2);
const pi = argv.indexOf("--paths");
const targets =
  pi < 0
    ? ["src/components", "src/app"]
    : argv
        .slice(pi + 1)
        .flatMap((a) => a.split(","))
        .filter(Boolean);
const walk = (d) =>
  statSync(d).isDirectory()
    ? readdirSync(d).flatMap((f) => walk(join(d, f)))
    : /\.(tsx?|jsx?)$/.test(d)
      ? [d]
      : [];
const files = targets.flatMap((t) => walk(join(root, t)));

const UTIL =
  "(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|decoration|shadow|accent|caret|placeholder)";
const LEGACY = new RegExp(
  `(?<![\\w-])(?:[\\w-]+:)*${UTIL}-(cream(?:-[\\w]+)?|sand|lavender(?:-[\\w]+)?|purple(?:-deep)?|lime(?:-deep)?|orange|grey-[123]|navy-[234]|navy|ink|surface-muted|accent(?:-fg)?)(?![\\w-])`,
  "g",
);
const LEGACY_VAR =
  /var\(--color-(?:cream[\w-]*|sand|lavender[\w-]*|purple[\w-]*|lime[\w-]*|orange|grey-[123]|navy(?:-[234])?|ink|surface-muted|accent(?:-fg)?)\)/g;
const ROUNDED =
  /(?<![\w-])(?:[\w-]+:)*rounded(?:-[a-z0-9]+)*(?:-\[[^\]]*\])?(?![\w-])/g;
const HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g;
const HEX_ALLOW = [
  /global-error\.tsx$/,
  /opengraph-image/,
  /twitter-image/,
  /icon\.tsx$/,
  /apple-icon/,
  /manifest\.ts$/,
];
const BRAND_HEX = /#(?:ffcb05|25d366|0a66c2|1877f2|000000|fff|ffffff|4285f4|34a853|fbbc05|ea4335|747775|1f1f1f|f8f9fa|8e918f|131314|e3e3e3|1f1f20)\b/i; // third-party brand + svg masks
const GOLD_TEXT =
  /(?<![\w-:])text-(?:gold-(?:300|400|500)|sky-(?:400|500))(?![\w-])/g;
const WHITE_ON_GOLD =
  /["'`][^"'`]*(?:(?<![\w-])bg-(?:gold-[3-6]00|primary)(?![\w-])[^"'`]*(?<![\w:-])text-white(?![\w-])|(?<![\w:-])text-white(?![\w-])[^"'`]*(?<![\w-])bg-(?:gold-[3-6]00|primary)(?![\w-]))[^"'`]*["'`]/;
/(?<![\w-])bg-(?:gold-[3-6]00|primary)(?![\w-]).*(?<![\w-:])text-white(?![\w-])|(?<![\w-:])text-white(?![\w-]).*(?<![\w-])bg-(?:gold-[3-6]00|primary)(?![\w-])/;
const GRAD = /(?<![\w-])bg-grad-[a-z-]+/g;

const errors = [];
const warnings = [];
for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  const lines = readFileSync(file, "utf8").split("\n");
  let grads = 0;
  // dark context = file/region opts in with theme-dark, on-navy, bg-navy-7xx+, bg-ink-9xx (checked per line, +-3 lines for multi-line class lists)
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return; // comments
    for (const m of line.matchAll(LEGACY))
      errors.push(`${at}  legacy colour  ${m[0]}`);
    for (const m of line.matchAll(LEGACY_VAR))
      errors.push(`${at}  legacy colour var  ${m[0]}`);
    for (const m of line.matchAll(ROUNDED)) {
      const cls = m[0].split(":").pop();
      if (cls === "rounded-none") continue;
      if (cls === "rounded-full") {
        const near = lines.slice(Math.max(0, i - 2), i + 3).join(" ");
        const sq =
          line.match(/(?<![\w-])size-(\d+(?:\.\d+)?|\[[^\]]+\])/) ||
          (() => {
            const w = line.match(/(?<![\w-])w-(\d+(?:\.\d+)?)/),
              h = line.match(/(?<![\w-])h-(\d+(?:\.\d+)?)/);
            return w && h && w[1] === h[1];
          })();
        if (sq || /data-round/.test(near)) continue;
        errors.push(
          `${at}  rounded-full on non-circle (add data-round or square size-N)`,
        );
        continue;
      }
      errors.push(`${at}  radius  ${m[0]}`);
    }
    if (!HEX_ALLOW.some((r) => r.test(rel)) && !/^\s*(\/\/|\*)/.test(line))
      for (const m of line.matchAll(HEX))
        if (
          !BRAND_HEX.test(m[0]) &&
          !/&#|url\(#|href="#|"#[a-z]/i.test(
            line.slice(Math.max(0, m.index - 6), m.index + 2),
          )
        )
          errors.push(`${at}  raw hex  ${m[0]}`);
    const ctx = lines.slice(Math.max(0, i - 3), i + 4).join(" ");
    const dark =
      /theme-dark|on-navy|data-dark|bg-(?:navy-[789]00|navy-950|ink-[89]00|ink-950|secondary|grad-(?:navy|night))/.test(
        ctx,
      );
    if (!dark)
      for (const m of line.matchAll(GOLD_TEXT))
        errors.push(`${at}  low-contrast text on light  ${m[0]}`);
    if (WHITE_ON_GOLD.test(line)) errors.push(`${at}  white text on gold`);
    grads += (line.match(GRAD) ?? []).length;
  });
  if (grads > 1)
    warnings.push(
      `${rel}  ${grads} bg-grad-* uses (max one gradient per view)`,
    );
}

for (const w of warnings) console.warn(`warn  ${w}`);
for (const e of errors) console.error(e);
console.log(
  `check:design  ${files.length} files, ${errors.length} issues, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
