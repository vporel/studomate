import Project, {
	PROJECT_SCHEMA_VERSION,
} from "@/schemas/project/project.schema";
import { LOCALES, type Locale } from "@/i18n/config";
import localizeProject from "./localize-project";
import { getMessages } from "@/i18n/messages";
import { compilePipelineDetailed } from "@tests/utils/test-helpers";
import { getTemplateStatement } from "./template-text";
import { FEATURED_TEMPLATE_ID, PROJECT_TEMPLATES } from "./index";

type Variant = { name: string; build: () => Project };

function variantsOf(template: (typeof PROJECT_TEMPLATES)[number]): Variant[] {
	const variants: Variant[] = [];
	for (const locale of LOCALES) {
		const localized = (build: (locale: Locale) => Project) => () => {
			const project = build(locale);
			localizeProject(project, locale, { keep: template.keepMnemonics });
			return project;
		};
		variants.push({
			name: `create (${locale})`,
			build: localized(template.create),
		});
		if (template.solution)
			variants.push({
				name: `solution (${locale})`,
				build: localized(template.solution),
			});
	}
	return variants;
}

describe("PROJECT_TEMPLATES — registre", () => {
	it("a des identifiants uniques", () => {
		const ids = PROJECT_TEMPLATES.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it.each(LOCALES)(
		"a un libellé et une description en %s pour chaque template",
		(locale) => {
			const templates = getMessages(locale).templates as Record<
				string,
				{ label?: string; description?: string }
			>;
			for (const { id } of PROJECT_TEMPLATES) {
				expect(templates[id]?.label).toBeTruthy();
				expect(templates[id]?.description).toBeTruthy();
			}
		},
	);

	it.each(LOCALES)("a un énoncé en %s pour chaque template", (locale) => {
		for (const { id } of PROJECT_TEMPLATES) {
			expect(getTemplateStatement(id, locale)).toBeTruthy();
		}
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
			const project = build();
			const { analysis, preCompilation, compilation } = compilePipelineDetailed(
				project,
				project.dialect,
			);
			expect(
				analysis.issues.filter((i) => i.severity === "error"),
			).toHaveLength(0);
			expect(preCompilation.errors).toHaveLength(0);
			expect(compilation.errors).toHaveLength(0);
		});
	});
});
