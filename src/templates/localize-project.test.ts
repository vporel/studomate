import { Dialect } from "@/expression-language/dialect.enum";
import { PROJECT_TEMPLATES } from "./index";
import localizeProject, { localizeMnemonic } from "./localize-project";
import TEMPLATE_MNEMONICS_EN from "./template-mnemonics.en";

const FRENCH_MNEMONICS = Object.keys(TEMPLATE_MNEMONICS_EN);

describe("TEMPLATE_MNEMONICS_EN", () => {
	it("n'a pas deux mnémoniques français vers le même mnémonique anglais", () => {
		const targets = Object.values(TEMPLATE_MNEMONICS_EN);
		expect(new Set(targets).size).toBe(targets.length);
	});
});

describe("localizeProject", () => {
	const template = PROJECT_TEMPLATES.find((t) => t.id === "traffic-light")!;

	it("laisse un projet français tel quel", () => {
		const project = template.create("fr");
		localizeProject(project, "fr");
		expect(project.dialect).toBe(Dialect.FR);
		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"rouge",
			"orange",
			"vert",
		]);
	});

	it("renomme les mnémoniques et passe au dialecte EN en anglais", () => {
		const project = template.create("en");
		localizeProject(project, "en");
		expect(project.dialect).toBe(Dialect.EN);
		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"red",
			"amber",
			"green",
		]);
	});

	it("épargne les mnémoniques de la liste keep", () => {
		const project = template.create("en");
		localizeProject(project, "en", { keep: ["orange"] });
		expect(project.variables.map((v) => v.mnemonic)).toEqual([
			"red",
			"orange",
			"green",
		]);
	});

	it("traduit les expressions des programmes avec le renommage", () => {
		const solution = PROJECT_TEMPLATES.find((t) => t.id === "linear-sequence")!
			.solution!("en");
		localizeProject(solution, "en");
		const expressions = Object.values(solution.grafcets).flatMap((grafcet) => [
			...Object.values(grafcet.transitions).map((t) => t.data.expression),
			...Object.values(grafcet.actions).map((a) => a.data.expression),
		]);
		expect(expressions.join(" ")).not.toMatch(
			/\b(dcy|fin1|fin2|sortie1|sortie2)\b/,
		);
		expect(expressions.join(" ")).not.toMatch(/\b(ET|OU|NON)\b/);
	});

	it.each(PROJECT_TEMPLATES.map((t) => [t.id, t] as const))(
		"%s : aucun mnémonique français ne subsiste en anglais (hors keep)",
		(_id, tpl) => {
			const project = (tpl.solution ?? tpl.create)("en");
			localizeProject(project, "en", { keep: tpl.keepMnemonics });
			const left = project.variables
				.map((v) => v.mnemonic)
				.filter(
					(m) =>
						FRENCH_MNEMONICS.includes(m) &&
						TEMPLATE_MNEMONICS_EN[m] !== m &&
						!tpl.keepMnemonics?.includes(m),
				);
			expect(left).toEqual([]);
		},
	);
});

describe("localizeMnemonic", () => {
	it("traduit un mnémonique de la table en anglais seulement", () => {
		expect(localizeMnemonic("descendre", "en")).toBe("down");
		expect(localizeMnemonic("descendre", "fr")).toBe("descendre");
	});

	it("laisse un mnémonique inconnu de la table tel quel", () => {
		expect(localizeMnemonic("Cmd_T1", "en")).toBe("Cmd_T1");
	});
});
