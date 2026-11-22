import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { createTranslator } from "next-intl";

/**
 * Names given to what the user creates from the store, in the interface language. Once created,
 * they belong to the project and no longer follow the language.
 */
export default function defaultContent(locale: Locale): {
	projectName: string;
	hmiPageName: string;
} {
	const t = createTranslator({
		locale,
		messages: getMessages(locale),
		namespace: "common.defaultContent",
	});
	return { projectName: t("projectName"), hmiPageName: t("hmiPageName") };
}
