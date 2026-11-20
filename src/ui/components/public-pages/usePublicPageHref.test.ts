/**
 * @jest-environment jsdom
 */
import type { Locale } from "@/i18n/config";
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import usePublicPageHref from "./usePublicPageHref";

let mockPathname = "/about";
let mockParams: Record<string, string> = {};

jest.mock("@/i18n/navigation", () => ({
	...jest.requireActual("@/i18n/navigation"),
	usePathname: () => mockPathname,
}));
jest.mock("next/navigation", () => ({
	...jest.requireActual("next/navigation"),
	useParams: () => mockParams,
}));

function hrefIn(
	target: Locale,
	{
		from = "fr",
		pathname,
	}: { from?: Locale; pathname?: Parameters<typeof usePublicPageHref>[0] } = {},
) {
	const { result } = renderHook(() => usePublicPageHref(pathname), {
		wrapper: i18nWrapper(from),
	});
	return result.current(target);
}

describe("usePublicPageHref", () => {
	beforeEach(() => {
		mockPathname = "/about";
		mockParams = {};
	});

	it("renvoie le chemin interne d'une page statique, quelle que soit la langue cible", () => {
		expect(hrefIn("en")).toBe("/about");
		expect(hrefIn("fr")).toBe("/about");
	});

	it("utilise le chemin passé en paramètre plutôt que celui de la page courante", () => {
		expect(hrefIn("en", { pathname: "/contact" })).toBe("/contact");
	});

	it("traduit le slug d'une section du manuel pour la langue cible", () => {
		mockPathname = "/user-manual/[section]";
		mockParams = { locale: "fr", section: "depannage" };

		expect(hrefIn("en")).toEqual({
			pathname: "/user-manual/[section]",
			params: { locale: "fr", section: "troubleshooting" },
		});
	});

	it("traduit le slug d'une étape de formation depuis l'anglais vers le français", () => {
		mockPathname = "/training/a2/[step]";
		mockParams = { locale: "en", step: "theory-edges" };

		expect(hrefIn("fr", { from: "en" })).toEqual({
			pathname: "/training/a2/[step]",
			params: { locale: "en", step: "theorie-fronts" },
		});
	});

	it("garde les paramètres des autres routes dynamiques tels quels", () => {
		mockPathname = "/legal/[doc]" as typeof mockPathname;
		mockParams = { doc: "x" };

		expect(hrefIn("en")).toEqual({
			pathname: "/legal/[doc]",
			params: { doc: "x" },
		});
	});

	it.each([
		["section de manuel inconnue", "/user-manual/[section]", { section: "zz" }],
		["étape de formation inconnue", "/training/a2/[step]", { step: "zz" }],
		["paramètres manquants", "/training/a2/[step]", {}],
	])("renvoie à l'accueil : %s", (_label, pathname, params) => {
		mockPathname = pathname as typeof mockPathname;
		mockParams = { locale: "fr", ...params };

		expect(hrefIn("en")).toBe("/");
	});
});
