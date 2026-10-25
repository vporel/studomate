import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem(
			"studomate_user_profile",
			JSON.stringify({ userType: null, schoolType: null }),
		);
		localStorage.setItem("studomate_product_tour_seen", "true");
	});
});

test("une étape de formation monte l'éditeur embarqué (grafcet) sans erreur", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	await page.goto("/formations/a1/observer-sequence-lineaire");

	await page.getByRole("button", { name: "Observer la simulation" }).click();

	await expect(page.locator(".react-flow").first()).toBeVisible({
		timeout: 30_000,
	});
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});

test("un exercice embarqué s'ouvre via « Ouvrir l'éditeur » et propose Exercice / Corrigé", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	await page.goto("/formations/a1/exercice-sequence-lineaire");

	await page.getByRole("button", { name: "Ouvrir l'éditeur" }).click();

	await expect(page.getByRole("tab", { name: "Exercice" })).toBeVisible({
		timeout: 30_000,
	});
	await expect(page.getByRole("tab", { name: "Corrigé" })).toBeVisible();
	await expect(page.locator(".react-flow").first()).toBeVisible();
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
