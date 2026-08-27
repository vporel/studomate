import Project from "@/schemas/project/project.schema";
import {
	createCrossroadsProject,
	createCrossroadsSolution,
} from "./crossroads.template";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";

const FEUX_KEYS = ["NS1", "NS2", "EO1", "EO2"];
const COULEURS = ["rouge", "orange", "vert"];

describe("crossroads.template", () => {
	describe("createCrossroadsProject (exercice)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCrossroadsProject();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("déclare les 12 variables de sortie (3 couleurs × 4 feux)", () => {
			expect(project.variables).toHaveLength(12);
			const mnemonics = project.variables.map((v) => v.mnemonic);
			for (const key of FEUX_KEYS) {
				for (const couleur of COULEURS) {
					expect(mnemonics).toContain(`${couleur}${key}`);
				}
			}
		});

		it("contient une page HMI avec 12 voyants animés", () => {
			const pages = Object.values(project.hmiPages);
			expect(pages).toHaveLength(1);
			const indicators = Object.values(pages[0].widgets).filter(
				(w) => w.type === "indicator",
			);
			expect(indicators).toHaveLength(12);
		});

		it("passe l'analyse sans erreur (projet sans programme est valide)", () => {
			const { analysis } = compilePipelineDetailed(project);
			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
		});
	});

	describe("createCrossroadsSolution (correction)", () => {
		let project: Project;

		beforeEach(() => {
			project = createCrossroadsSolution();
		});

		it("produit un projet valide", () => {
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
		});

		it("conserve les 12 variables et la page HMI de l'exercice", () => {
			expect(project.variables).toHaveLength(12);
			expect(Object.values(project.hmiPages)).toHaveLength(1);
		});

		it("passe le pipeline complet sans erreur d'analyse ni de compilation", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(project);

			const errors = analysis.issues.filter((i) => i.severity === "error");
			expect(errors).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
			expect(compilation.result).toBeDefined();
		});

		it("produit des routines exécutables (grafcet + Main)", () => {
			const { compilation } = compilePipelineDetailed(project);
			// 1 grafcet + 1 Main + la routine d'observation des réceptivités
			expect(compilation.result!.routines).toHaveLength(3);
		});

		it("active des sorties NS et EO complémentaires selon les phases", () => {
			const grafcet = Object.values(project.grafcets)[0];
			const expressions = Object.values(grafcet.actions).map(
				(a) => a.data.expression,
			);
			// NS vert, EO rouge
			expect(expressions).toContain("vertNS1");
			expect(expressions).toContain("rougeEO1");
			// NS rouge, EO vert
			expect(expressions).toContain("rougeNS1");
			expect(expressions).toContain("vertEO1");
		});

		it("comporte deux phases de tout-rouge (dégagement) entre les verts antagonistes", () => {
			const grafcet = Object.values(project.grafcets)[0];
			// Une phase de tout-rouge = une étape dont les 4 actions pilotent les 4 rouge*
			const allRedSteps = Object.values(grafcet.steps).filter((step) => {
				const mnemonics = Object.values(grafcet.actions)
					.filter((a) =>
						grafcet.connections.some(
							(c) => c.source.id === step.id && c.target.id === a.id,
						),
					)
					.map((a) => a.data.expression)
					.sort();
				return (
					mnemonics.length === 4 &&
					mnemonics.join(",") === "rougeEO1,rougeEO2,rougeNS1,rougeNS2"
				);
			});
			expect(allRedSteps).toHaveLength(2);
		});
	});
});
