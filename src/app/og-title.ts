import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { OgImageKey } from "./og-image";

/** Title drawn on the share image of a page family, in `locale`. */
export default function ogTitle(locale: Locale, key: OgImageKey): string {
	const { public: pub, training } = getMessages(locale);
	switch (key) {
		case "default":
			return pub.metadata.homeTitle;
		case "training":
			return pub.metadata.trainingTitle;
		case "glossary":
			return pub.metadata.glossaryTitle;
		case "manual":
			return pub.metadata.manualTitle;
		default:
			return training[`${key}PageTitle`];
	}
}
