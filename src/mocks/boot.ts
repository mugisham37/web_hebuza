// Dummy-data mode (no backend yet): start MSW and hold every /api/* fetch until the worker answers.
// Imported once from the client Providers; a no-op unless NEXT_PUBLIC_API_MOCKING=on.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_MOCKING === "on") {
  const real = window.fetch.bind(window);
  const ready = import("./browser")
    .then(({ worker }) => worker.start({ quiet: true }))
    .catch((e) => console.error("[mocks] worker failed to start", e));
  const isApi = (i: RequestInfo | URL) => (typeof i === "string" ? i : i instanceof URL ? i.href : i.url).includes("/api/");
  window.fetch = async (input, init) => {
    if (isApi(input)) await ready;
    return real(input, init);
  };
}
export {};
