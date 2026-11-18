import type en from "@/shared/i18n/dictionaries/en.json";
import { intlLocale, type Locale } from "@/shared/i18n/config";

export type Dictionary = typeof en;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];
/** Every valid dotted key, e.g. "status.in_progress". Typos fail type-check. */
export type MessageKey = Leaves<Dictionary>;
export type Values = Record<string, string | number>;

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in node) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

// {name, plural, =0 {…} one {…} other {…}} — '#' inside a branch is the formatted number.
const PLURAL = /\{(\w+),\s*plural,\s*((?:[^{}]*\{[^{}]*\})+)\s*\}/g;
const BRANCH = /(=\d+|\w+)\s*\{([^{}]*)\}/g;

export function format(template: string, values: Values | undefined, locale: Locale): string {
  if (!values) return template;
  const rules = new Intl.PluralRules(intlLocale[locale]);
  const out = template.replace(PLURAL, (_, name: string, body: string) => {
    const n = Number(values[name] ?? 0);
    const branches = Object.fromEntries([...body.matchAll(BRANCH)].map((m) => [m[1], m[2]]));
    const chosen = branches[`=${n}`] ?? branches[rules.select(n)] ?? branches.other ?? "";
    return chosen.replace(/#/g, new Intl.NumberFormat(intlLocale[locale]).format(n));
  });
  return out.replace(/\{(\w+)\}/g, (m, name: string) => (name in values ? String(values[name]) : m));
}

export function createTranslator(dict: Dictionary, locale: Locale) {
  return (key: MessageKey, values?: Values): string => format(lookup(dict, key) ?? key, values, locale);
}
export type Translator = ReturnType<typeof createTranslator>;
