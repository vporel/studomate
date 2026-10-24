import { PROJECT_TEMPLATES } from "./index";
import localizeProject from "./localize-project";

const ACCENTED = /[àâäçéèêëîïôöùûüÿœÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒ]/;

function strings(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value && typeof value === "object")
		return Object.values(value).flatMap(strings);
	return [];
}

describe.each(PROJECT_TEMPLATES)("template $id en anglais", (template) => {
	const variants = [
		{ name: "create", build: template.create },
		...(template.solution
			? [{ name: "solution", build: template.solution }]
			: []),
	];

	it.each(variants)(
		"$name : aucun texte du projet n'est accentué",
		({ build }) => {
			const project = build("en");
			localizeProject(project, "en", { keep: template.keepMnemonics });
			const accented = strings(JSON.parse(JSON.stringify(project))).filter(
				(text) => ACCENTED.test(text),
			);
			expect(accented).toEqual([]);
		},
	);

	it.each(variants)("$name : même structure qu'en français", ({ build }) => {
		const fr = build("fr");
		const en = build("en");
		expect(Object.keys(en.grafcets)).toHaveLength(
			Object.keys(fr.grafcets).length,
		);
		expect(Object.keys(en.ladders)).toHaveLength(
			Object.keys(fr.ladders).length,
		);
		expect(Object.keys(en.hmiPages)).toHaveLength(
			Object.keys(fr.hmiPages).length,
		);
		expect(en.variables).toHaveLength(fr.variables.length);
	});
});
