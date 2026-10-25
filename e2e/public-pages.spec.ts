import { expect, test } from "@playwright/test";

const PAGES = [
	{ locale: "fr", path: "/", suffix: /simulateur GRAFCET/ },
	{ locale: "en", path: "/en", suffix: /Simulator/ },
	{
		locale: "fr",
		path: "/manuel-utilisateur",
		suffix: /Manuel utilisateur — Studomate/,
	},
	{ locale: "en", path: "/en/user-manual", suffix: /User manual — Studomate/ },
	{ locale: "fr", path: "/formations", suffix: /formation .* — Studomate/i },
	{ locale: "en", path: "/en/training", suffix: /training — Studomate/i },
	{
		locale: "fr",
		path: "/formations/a1/observer-sequence-lineaire",
		suffix: /Studomate/,
	},
	{
		locale: "en",
		path: "/en/training/a1/observe-linear",
		suffix: /Studomate/,
	},
];

for (const { locale, path, suffix } of PAGES) {
	test(`page publique ${path} : métadonnées, structure et rendu sans erreur`, async ({
		page,
	}) => {
		const pageErrors: string[] = [];
		page.on("pageerror", (error) => pageErrors.push(error.message));

		const response = await page.goto(path);
		expect(response?.status()).toBe(200);

		await expect(page).toHaveTitle(suffix);
		await expect(page.locator("html")).toHaveAttribute("lang", locale);
		await expect(page.locator("h1")).toHaveCount(1);

		const canonical = await page
			.locator('link[rel="canonical"]')
			.getAttribute("href");
		expect(canonical).toMatch(new RegExp(`${path === "/" ? "" : path}$`));
		await expect(
			page.locator('link[rel="alternate"][hreflang]'),
		).not.toHaveCount(0);

		// Une clé de traduction manquante s'affiche telle quelle ("namespace.key").
		const text = await page.locator("body").innerText();
		expect(text).not.toMatch(
			/\b(public|manual|training|common)\.[a-zA-Z]+\.[a-zA-Z.]+\b/,
		);
		expect(pageErrors, pageErrors.join("\n")).toEqual([]);
	});
}

test("le lien hreflang pointe vers l'équivalent traduit de la page", async ({
	page,
}) => {
	await page.goto("/manuel-utilisateur");
	const english = page.locator('link[rel="alternate"][hreflang="en"]');
	const href = await english.getAttribute("href");
	expect(href).toContain("/en/user-manual");
	await page.goto(new URL(href!).pathname);
	await expect(page).toHaveTitle(/User manual/);
});
