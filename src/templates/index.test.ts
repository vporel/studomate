import Project, {
	PROJECT_SCHEMA_VERSION,
} from "@/schemas/project/project.schema";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { FEATURED_TEMPLATE_ID, PROJECT_TEMPLATES } from "./index";

type Variant = { name: string; build: () => Project };

function variantsOf(template: (typeof PROJECT_TEMPLATES)[number]): Variant[] {
	const variants: Variant[] = [{ name: "create", build: template.create }];
	if (template.solution)
		variants.push({ name: "solution", build: template.solution });
	return variants;
}

describe("PROJECT_TEMPLATES — registre", () => {
	it("a des identifiants uniques", () => {
		const ids = PROJECT_TEMPLATES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("FEATURED_TEMPLATE_ID désigne une entrée existante pourvue d'une solution", () => {
		const featured = PROJECT_TEMPLATES.find(
			(t) => t.id === FEATURED_TEMPLATE_ID,
		);
		expect(featured).toBeDefined();
		expect(featured!.solution).toBeDefined();
	});
});

describe.each(PROJECT_TEMPLATES)("template $id", (template) => {
	describe.each(variantsOf(template))("$name", ({ build }) => {
		it("produit un Project à la version de schéma courante", () => {
			const project = build();
			expect(project).toBeInstanceOf(Project);
			expect(project.id).toBeTruthy();
			expect(project.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
		});

		it("survit à un round-trip JSON à l'identique", () => {
			const project = build();
			const roundTripped = Project.createFromJSON(JSON.stringify(project));
			expect(JSON.parse(JSON.stringify(roundTripped))).toEqual(
				JSON.parse(JSON.stringify(project)),
			);
		});

		it("passe analyse → pré-compilation → compilation sans erreur", () => {
			const { analysis, preCompilation, compilation } =
				compilePipelineDetailed(build());
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
		});
	});
});
