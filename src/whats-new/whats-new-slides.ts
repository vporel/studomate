/**
 * Slides of the "what's new" carousel for `APP_VERSION`. Each id has a `title` and a `body`
 * under `whatsNew.slides.<id>` in every locale, and an icon in `WhatsNewModal`.
 */
const WHATS_NEW_SLIDE_IDS = ["offline", "scene3d"] as const;

export type WhatsNewSlideId = (typeof WHATS_NEW_SLIDE_IDS)[number];

export default WHATS_NEW_SLIDE_IDS;
