import Project from "@/schemas/project/project.schema";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import StepBuilder from "@/schemas/grafcet/builders/step.builder";
import { PROJECT_SCHEMA_VERSION } from "@/schemas/project/project.schema";
import {
	PROJECT_FILE_EXTENSION,
	PROJECT_FILE_MIME_TYPE,
	importProjectFromFile,
	parseProjectFromFile,
	ProjectFileError,
	type ProjectFileErrorReason,
	serializeProjectToFile,
} from "./project-file";

function rejectionReason(text: string): ProjectFileErrorReason | null {
	try {
		parseProjectFromFile(text);
		return null;
	} catch (error) {
		expect(error).toBeInstanceOf(ProjectFileError);
		return (error as ProjectFileError).reason;
	}
}

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
			expect(Object.keys(relu.grafcets.g1.steps)).toHaveLength(1);
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
			grafcets: {
				g1: { id: "g1", name: "Grafcet 1", steps: [], connections: [] },
			},
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
			expect(rejectionReason("{ pas du JSON")).toBe("not-json");
		});

		it("refuse un contenu qui n'est pas un objet", () => {
			expect(rejectionReason("42")).toBe("not-a-project");
			expect(rejectionReason("null")).toBe("not-a-project");
		});

		it("refuse un tableau", () => {
			expect(rejectionReason("[]")).toBe("not-a-project");
		});

		// Scénario deux versions en parallèle : ne pas interpréter à moitié, ni réécrire
		it("refuse un projet écrit par une version plus récente", () => {
			const futur = JSON.stringify({
				id: "p1",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
			});

			expect(rejectionReason(futur)).toBe("newer-version");
		});

		it("refuses a JSON object that is not a project", () => {
			expect(rejectionReason('{"foo":1}')).toBe("not-a-project");
		});

		it("refuses a project whose shape is broken", () => {
			const raw = JSON.parse(serializeProjectToFile(projetAvecGrafcet()));
			raw.programs.g1.type = "sfc";

			expect(rejectionReason(JSON.stringify(raw))).toBe("not-a-project");
		});
	});

	describe("importProjectFromFile", () => {
		it("attribue un identifiant différent de celui du fichier", () => {
			const importe = importProjectFromFile(
				serializeProjectToFile(projetAvecGrafcet()),
			);

			expect(importe.id).toBeTruthy();
			expect(importe.id).not.toBe("p1");
		});

		it("attribue un identifiant distinct à chaque import du même fichier", () => {
			const texte = serializeProjectToFile(projetAvecGrafcet());

			expect(importProjectFromFile(texte).id).not.toBe(
				importProjectFromFile(texte).id,
			);
		});

		it("conserve le contenu du projet", () => {
			const texte = serializeProjectToFile(projetAvecGrafcet());

			const importe = importProjectFromFile(texte);
			const { id: _lu, ...attendu } = JSON.parse(
				JSON.stringify(parseProjectFromFile(texte)),
			);
			const { id: _importe, ...obtenu } = JSON.parse(JSON.stringify(importe));

			expect(obtenu).toEqual(attendu);
			expect(importe.name).toBe("Projet");
			expect(Object.keys(importe.grafcets)).toEqual(["g1"]);
		});

		it("refuse un contenu qui n'est pas un objet", () => {
			expect(() => importProjectFromFile("[]")).toThrow(ProjectFileError);
			expect(() => importProjectFromFile("42")).toThrow(ProjectFileError);
		});

		it("refuse un projet écrit par une version plus récente", () => {
			const futur = JSON.stringify({
				id: "p1",
				schemaVersion: PROJECT_SCHEMA_VERSION + 1,
			});

			expect(() => importProjectFromFile(futur)).toThrow(ProjectFileError);
		});
	});
});

describe("project file format", () => {
	it("is a JSON file", () => {
		expect(PROJECT_FILE_EXTENSION).toBe(".json");
		expect(PROJECT_FILE_MIME_TYPE).toBe("application/json");
	});
});
