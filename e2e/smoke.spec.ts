import { expect, test } from "@playwright/test";

/**
 * Parcours unique : ouvrir la solution du template mis en avant → l'éditeur complet se monte →
 * ouvrir le grafcet → entrer en simulation → la boucle PLC tourne sans erreur.
 *
 * L'intérêt n'est pas de rejouer une logique métier précise (les tests d'intégration Jest le
 * font) mais d'attraper ce qu'aucun test unitaire RTL ne voit : une régression au montage de
 * l'éditeur (React Flow, DataGrid, TreeView chargés d'un coup) ou dans la boucle de simulation
 * réelle du navigateur.
 */
test("ouvre une solution de template, monte l'éditeur et simule sans erreur", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	await page.goto("/app");

	await page
		.getByRole("button", { name: "Ouvrir la solution et simuler" })
		.click();

	// Shell monté : le sélecteur de mode (design/simulation) est là.
	const modeSelect = page
		.locator("select")
		.filter({ has: page.locator('option[value="SIMULATION"]') });
	await expect(modeSelect).toBeVisible({ timeout: 30_000 });

	// Ouvre le grafcet depuis l'explorateur → le canvas React Flow se monte.
	await page
		.getByRole("treeitem", { name: "Feu tricolore", exact: true })
		.click();
	await expect(page.locator(".react-flow").first()).toBeVisible();

	// Ouvre aussi le Main (Ladder) : c'est le montage de l'éditeur Ladder qui a déjà régressé
	// en perf (toutes les sections montées d'un coup) — un crash ici remonterait en pageerror.
	await page.getByRole("treeitem", { name: "Main", exact: true }).click();
	await expect(page.getByRole("tab", { name: "Main" })).toBeVisible();
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);

	await modeSelect.selectOption("SIMULATION");
	await expect(modeSelect).toHaveValue("SIMULATION");

	// Laisse la boucle PLC enchaîner de nombreux cycles (le premier franchissement temporisé du
	// feu tricolore tombe à 10 s) : une erreur de cycle remonterait en toast ou en pageerror.
	await page.waitForTimeout(12_000);

	await expect(modeSelect).toHaveValue("SIMULATION");
	await expect(page.locator(".Toastify__toast--error")).toHaveCount(0);
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
