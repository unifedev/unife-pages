// The noun unife-pages adds to `$` for other mods (07 §Discovery per host). Dependents list "unife-pages"
// under `dependencies` in their plugin.json and get `$.pages` typed.
export type ContributorCall = { method: string; params: unknown; caller: { sessionId: string | null; scope: string | null }; requestId: string };
export type ContributorAnswer =
  | { ok: true; result: unknown }
  | { ok: false; error: { code: string; message?: string; reason?: string; detail?: unknown } };
export type PagesNoun = {
  /** Registers a contributor namespace for this session; the handler answers every call to it. */
  contribute(declaration: { namespace: string; [k: string]: unknown }, handler: (call: ContributorCall) => Promise<ContributorAnswer>): Promise<{ ok: boolean; error?: string }>;
};
declare module "claude-code" {
  interface EngineInterface { pages: PagesNoun }
}
