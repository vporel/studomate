import { expect, test } from "@playwright/test";

test.use({ locale: "fr-FR" });

const PROJECT_NAME = "Projet e2e";

test("crée un projet, y ajoute un grafcet, l'enregistre puis le retrouve après rechargement", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	await page.addInitScript(() => {
		if (sessionStorage.getItem("e2e_seeded")) return;
		sessionStorage.setItem("e2e_seeded", "true");
		localStorage.setItem(
			"studomate_user_profile",
			JSON.stringify({ userType: null, schoolType: null }),
		);
		localStorage.setItem("studomate_product_tour_seen", "true");
	});

	await page.goto("/app");
	// Le premier clic peut précéder l'hydratation : on réessaie jusqu'à l'ouverture de la modale.
	await expect(async () => {
		await page.getByRole("button", { name: "Nouveau projet" }).click();
		await expect(page.getByRole("dialog")).toBeVisible({ timeout: 1_000 });
	}).toPass({ timeout: 15_000 });
	await page.getByRole("button", { name: /^Projet vide/ }).click();
	await page.getByRole("button", { name: "Créer", exact: true }).click();

	const nameField = page.getByRole("textbox").first();
	await expect(nameField).toHaveValue("Nouveau projet", { timeout: 30_000 });
	await nameField.fill(PROJECT_NAME);
	await nameField.press("Enter");

	const explorer = page.getByRole("tree", { name: "Explorateur du projet" });
	const grafcetItem = explorer.getByRole("treeitem", {
		name: "Grafcet_1",
		exact: true,
	});

	await page.getByRole("menuitem", { name: "Nouveau grafcet" }).click();
	await expect(grafcetItem).toBeVisible();

	await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
	const saveDialog = page.getByRole("dialog", {
		name: "Où enregistrer ce projet ?",
	});
	await saveDialog.getByRole("button", { name: "Enregistrer" }).click();
	await expect(saveDialog).toBeHidden();

	expect(
		await page.evaluate(() => localStorage.getItem("studomate_projects_data")),
	).toContain(PROJECT_NAME);

	// Le rechargement rouvre le projet enregistré directement dans l'éditeur.
	await page.reload();
	await expect(page.getByRole("textbox").first()).toHaveValue(PROJECT_NAME, {
		timeout: 30_000,
	});
	await expect(grafcetItem).toBeVisible();
	expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
