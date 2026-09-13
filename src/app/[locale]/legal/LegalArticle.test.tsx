import { createTranslator } from "next-intl";
import { isValidElement, type ReactNode } from "react";
import en from "@/i18n/messages/en/public.json";
import fr from "@/i18n/messages/fr/public.json";
import { renderStrong } from "./LegalArticle";

/**
 * Régression : ces textes contiennent des apostrophes suivies (ou précédées) de plusieurs
 * balises `<strong>`. Le format ICU de next-intl consomme les apostrophes isolées comme un
 * échappement, ce qui casse la détection des balises dès qu'un message en contient deux — d'où
 * l'usage systématique de `t.raw(key)` (jamais `t(key)`) avant `renderStrong`.
 */
const BODY_KEYS: Array<[namespace: "about" | "privacy" | "terms" | "legal", key: string]> = [
	["about", "missionBody"],
	["privacy", "introBody"],
	["privacy", "collectedBody"],
	["privacy", "analyticsBody"],
	["privacy", "accountsBody"],
	["privacy", "accountsHosting"],
	["terms", "purposeBody"],
	["terms", "accountsBody"],
	["legal", "editorBody"],
];

function countStrongElements(nodes: ReactNode): number {
	if (Array.isArray(nodes)) {
		return nodes.reduce((sum: number, n) => sum + countStrongElements(n), 0);
	}
	return isValidElement(nodes) && nodes.type === "strong" ? 1 : 0;
}

describe.each([
	["fr", fr],
	["en", en],
] as const)("renderStrong(t.raw(key)) — locale %s", (locale, messages) => {
	it.each(BODY_KEYS)("renders %s.%s without falling back to the raw key", (namespace, key) => {
		const t = createTranslator({ locale, messages: messages[namespace] });

		const raw = t.raw(key);
		expect(typeof raw).toBe("string");

		const expectedStrongCount = (raw.match(/<strong>/g) ?? []).length;
		expect(expectedStrongCount).toBeGreaterThan(0);

		const rendered = renderStrong(raw);
		expect(countStrongElements(rendered)).toBe(expectedStrongCount);
	});
});
