import { defineConfig, devices } from "@playwright/test";

/**
 * Un seul parcours de bout en bout (voir `e2e/`), lancé en CI en plus de la suite Jest :
 * filet de sécurité contre les régressions que les tests unitaires RTL ne voient pas (montage
 * de l'éditeur complet — React Flow de toutes les sections, DataGrid, TreeView —, entrée en
 * simulation, boucle PLC réelle dans le navigateur).
 *
 * `output: "standalone"` (voir `next.config.ts`) : le serveur de prod se lance via
 * `.next/standalone/server.js`, pas `next start`. La commande `webServer` construit puis démarre
 * ce serveur ; en local, `reuseExistingServer` réutilise un `npm run dev` déjà lancé.
 */
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL,
		trace: "on-first-retry",
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
	],
	webServer: {
		command: "npm run build && node .next/standalone/server.js",
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
	},
});
