/**
 * Version the carousel's slides belong to: the last release that came with news. It never
 * exceeds `APP_VERSION`, and is the version recorded once a browser has seen the carousel.
 */
export const WHATS_NEW_VERSION = "v1.8.0";

/**
 * Slides of the "what's new" carousel for `WHATS_NEW_VERSION`. Each id has a `title` and a `body`
 * under `whatsNew.slides.<id>` in every locale, and an icon in `WhatsNewModal`.
 */
const WHATS_NEW_SLIDE_IDS = ["spanishLanguage", "imageExport"] as const;

export type WhatsNewSlideId = (typeof WHATS_NEW_SLIDE_IDS)[number];

export default WHATS_NEW_SLIDE_IDS;
