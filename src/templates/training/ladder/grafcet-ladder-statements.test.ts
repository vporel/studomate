import { PROJECT_TEMPLATES } from "@/templates/index";

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
const STUDENT_NAMED = new Set(["TON", "t_vert", "t_orange", "t_rouge"]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function inlineIdentifiers(statement: string): string[] {
	return [...statement.matchAll(/`([^`]+)`/g)]
		.map((match) => match[1])
		.filter((token) => IDENTIFIER.test(token));
}

describe("énoncés des templates GRAFCET vers Ladder", () => {
	it.each(GRAFCET_LADDER_TEMPLATE_IDS)(
		"%s : chaque variable citée dans l'énoncé existe dans le projet",
		(id) => {
			const template = PROJECT_TEMPLATES.find((t) => t.id === id);
			expect(template?.statement).toBeTruthy();
			const mnemonics = new Set(
				template!.create().variables.map((variable) => variable.mnemonic),
			);
			const unknown = inlineIdentifiers(template!.statement!).filter(
				(name) => !mnemonics.has(name) && !STUDENT_NAMED.has(name),
			);
			expect(unknown).toEqual([]);
		},
	);
});
