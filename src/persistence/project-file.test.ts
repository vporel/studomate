import Project from "@/schemas/project/project.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import { parseProjectFromFile, serializeProjectToFile } from "./project-file";

function projetAvecGrafcet() {
	const project = new Project("p1", "Projet", "Enseignante");
	project.addProgram(
		new GrafcetBuilder()
			.id("g1")
			.addStep(new StepBuilder().id("s1").number(1).build())
			.build(),
	);
	return project;
}

describe("fichier de projet", () => {
	describe("aller-retour", () => {
		it("restitue un projet exporté", () => {
			const original = projetAvecGrafcet();

			const relu = parseProjectFromFile(serializeProjectToFile(original));

			expect(relu.id).toBe("p1");
			expect(relu.name).toBe("Projet");
			expect(relu.author).toBe("Enseignante");
			expect(Object.keys(relu.grafcets)).toEqual(["g1"]);
			expect(relu.grafcets.g1.steps).toHaveLength(1);
		});

		it("porte la version de schéma dans le projet lui-même", () => {
			const fichier = JSON.parse(serializeProjectToFile(projetAvecGrafcet()));

			// Pas d'enveloppe : extraire ou recopier le contenu ne peut pas perdre la version
			expect(fichier.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
			expect(fichier.id).toBe("p1");
		});
	});

	/**
	 * Régression : un fichier exporté avant l'introduction de `programs` faisait échouer
	 * l'import, le chemin fichier ne passant par aucune migration.
	 */
	describe("fichier exporté par une version antérieure", () => {
		const fichierAncien = JSON.stringify({
			id: "p1",
			name: "Projet de l'enseignante",
			variables: [],
			grafcets: { g1: { id: "g1", name: "Grafcet 1", steps: [], connections: [] } },
		});

		it("s'importe sans échouer", () => {
			expect(() => parseProjectFromFile(fichierAncien)).not.toThrow();
		});

		it("conserve les grafcets", () => {
			const relu = parseProjectFromFile(fichierAncien);

			expect(Object.keys(relu.grafcets)).toEqual(["g1"]);
			expect(relu.grafcets.g1.name).toBe("Grafcet 1");
		});

		it("conserve les métadonnées du projet", () => {
			const relu = parseProjectFromFile(fichierAncien);

			expect(relu.name).toBe("Projet de l'enseignante");
		});
	});

	describe("contenu invalide", () => {
		it("refuse un fichier qui n'est pas du JSON", () => {
			expect(() => parseProjectFromFile("{ pas du JSON")).toThrow();
		});

		it("refuse un contenu qui n'est pas un objet", () => {
			expect(() => parseProjectFromFile("42")).toThrow("ne contient pas un projet");
			expect(() => parseProjectFromFile("null")).toThrow("ne contient pas un projet");
		});

		it("refuse un tableau", () => {
			expect(() => parseProjectFromFile("[]")).toThrow("ne contient pas un projet");
		});

		// Scénario deux versions en parallèle : ne pas interpréter à moitié, ni réécrire
		it("refuse un projet écrit par une version plus récente", () => {
			const futur = JSON.stringify({ id: "p1", schemaVersion: PROJECT_SCHEMA_VERSION + 1 });

			expect(() => parseProjectFromFile(futur)).toThrow("version plus récente");
		});
	});
});
