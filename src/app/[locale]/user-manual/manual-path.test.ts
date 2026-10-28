import manualPath from "./manual-path";

describe("manualPath", () => {
	it("sert l'introduction à l'URL de base du manuel", () => {
		expect(manualPath("fr", "intro")).toBe("/manuel-utilisateur");
		expect(manualPath("en", "intro")).toBe("/en/user-manual");
	});

	it("donne à chaque section de premier niveau son slug traduit", () => {
		expect(manualPath("fr", "hmi")).toBe("/manuel-utilisateur/interfaces-hmi");
		expect(manualPath("en", "hmi")).toBe("/en/user-manual/hmi");
		expect(manualPath("fr", "troubleshooting")).toBe(
			"/manuel-utilisateur/depannage",
		);
	});

	it("pointe une sous-section vers l'ancre de la page de son parent", () => {
		expect(manualPath("fr", "ladder-coils")).toBe(
			"/manuel-utilisateur/ladder#ladder-coils",
		);
	});

	it("renvoie null pour un id inconnu", () => {
		expect(manualPath("fr", "nope")).toBeNull();
	});
});
