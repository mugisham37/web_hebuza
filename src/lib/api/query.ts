// Query string / URLSearchParams → openapi-fetch `params.query` object (empty-value filtering stays with the builder).
export const toQuery = (s: string | URLSearchParams | undefined | null) => Object.fromEntries(new URLSearchParams(s ?? ""));
