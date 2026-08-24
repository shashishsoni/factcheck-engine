import { InputAdapterRegistry } from "./types";
import { articleAdapter, urlAdapter } from "./url";
import { imageAdapter } from "./image";
import { videoAdapter } from "./video";
import { audioAdapter } from "./audio";
import { bookAdapter } from "./book";
import { socialAdapter } from "./social";
import { textAdapter } from "./text";

/**
 * Order matters: more specific adapters first so they win over the generic URL
 * adapter. Social and article are checked before url; book ISBN/URLs before url.
 * textAdapter is the catch-all fallback and MUST be registered last — it
 * matches any non-empty string, so anything after it would never be reached.
 */
export const inputRegistry = new InputAdapterRegistry()
  .register(socialAdapter)
  .register(articleAdapter)
  .register(bookAdapter)
  .register(imageAdapter)
  .register(videoAdapter)
  .register(audioAdapter)
  .register(urlAdapter)
  .register(textAdapter);

export type { InputAdapter, InputAdapterRegistry } from "./types";
