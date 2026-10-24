import { LOCALES } from "@/i18n/config";
import { PROJECT_TEMPLATES } from "@/templates/index";
import localizeProject from "@/templates/localize-project";
import { getTemplateStatement } from "@/templates/template-text";

const GRAFCET_LADDER_TEMPLATE_IDS = [
	"linear-sequence-naive-ladder",
	"linear-sequence-ladder",
	"drilling-ladder",
	"or-divergence-ladder",
	"and-divergence-ladder",
	"traffic-light-ladder",
	"parking-ladder",
	"gate-grafcet-ladder",
];

/** Timer instances and block types the statements mention without the project providing them. */
const STUDENT_NAMED = new Set([
	"TON",
	"t_vert",
	"t_orange",
	"t_rouge",
	"t_green",
	"t_amber",
	"t_red",
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function inlineIdentifiers(statement: string): string[] {
	return [...statement.matchAll(/`([^`]+)`/g)]
		.map((match) => match[1])
		.filter((token) => IDENTIFIER.test(token));
}

describe.each(LOCALES)(
	"énoncés des templates GRAFCET vers Ladder (%s)",
	(locale) => {
		it.each(GRAFCET_LADDER_TEMPLATE_IDS)(
			"%s : chaque variable citée dans l'énoncé existe dans le projet",
			(id) => {
				const template = PROJECT_TEMPLATES.find((t) => t.id === id)!;
				const statement = getTemplateStatement(id, locale);
				expect(statement).toBeTruthy();
				const project = template.create(locale);
				localizeProject(project, locale, { keep: template.keepMnemonics });
				const mnemonics = new Set(
					project.variables.map((variable) => variable.mnemonic),
				);
				const unknown = inlineIdentifiers(statement!).filter(
					(name) => !mnemonics.has(name) && !STUDENT_NAMED.has(name),
				);
				expect(unknown).toEqual([]);
			},
		);
	},
);
