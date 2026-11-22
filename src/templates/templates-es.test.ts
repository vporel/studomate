import { PROJECT_TEMPLATES } from "./index";
import localizeProject from "./localize-project";

const NON_ASCII_MNEMONIC = /[^\x20-\x7e]/;

describe.each(PROJECT_TEMPLATES)("template $id en espagnol", (template) => {
	const variants = [
		{ name: "create", build: template.create },
		...(template.solution
			? [{ name: "solution", build: template.solution }]
			: []),
	];

	it.each(variants)(
		"$name : les mnémoniques des variables sont ceux de l'anglais, sans accent",
		({ build }) => {
			const project = build("es");
			localizeProject(project, "es", { keep: template.keepMnemonics });
			const accented = project.variables
				.map((v) => v.mnemonic)
				.filter((mnemonic) => NON_ASCII_MNEMONIC.test(mnemonic));
			expect(accented).toEqual([]);
		},
	);

	it.each(variants)("$name : même structure qu'en français", ({ build }) => {
		const fr = build("fr");
		const es = build("es");
		expect(Object.keys(es.grafcets)).toHaveLength(
			Object.keys(fr.grafcets).length,
		);
		expect(Object.keys(es.ladders)).toHaveLength(
			Object.keys(fr.ladders).length,
		);
		expect(Object.keys(es.hmiPages)).toHaveLength(
			Object.keys(fr.hmiPages).length,
		);
		expect(es.variables).toHaveLength(fr.variables.length);
	});
});
