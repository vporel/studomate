import { getMessages } from "@/i18n/messages";
import { PROJECT_TEMPLATES } from "@/templates/index";
import TEMPLATE_MNEMONICS_EN from "@/templates/template-mnemonics.en";

const FRENCH_MNEMONICS = Object.entries(TEMPLATE_MNEMONICS_EN)
	.filter(([french, english]) => french !== english)
	.map(([french]) => french);

/** Templates whose variables come from a 3D scene and keep their original names. */
const TEMPLATES_KEEPING_MNEMONICS: string[] = PROJECT_TEMPLATES.filter(
	(template) => template.keepMnemonics,
).map((template) => template.id);

const CODE_SPAN = /`([^`\n]*)`|<code>(.*?)<\/code>/gs;
const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g;

function strings(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value && typeof value === "object")
		return Object.values(value).flatMap(strings);
	return [];
}

function frenchMnemonicsInCode(text: string): string[] {
	const found: string[] = [];
	for (const span of text.matchAll(CODE_SPAN)) {
		for (const token of (span[1] ?? span[2]).matchAll(IDENTIFIER)) {
			if (FRENCH_MNEMONICS.includes(token[0])) found.push(token[0]);
		}
	}
	return found;
}

describe("textes anglais : aucun mnémonique de template resté en français dans le code cité", () => {
	const messages = getMessages("en");

	it.each(["training", "glossary", "manual", "templateContent"] as const)(
		"%s",
		(namespace) => {
			const content =
				namespace === "templateContent"
					? Object.fromEntries(
							Object.entries(messages.templateContent).filter(
								([id]) => !TEMPLATES_KEEPING_MNEMONICS.includes(id),
							),
						)
					: messages[namespace];
			const left = strings(content).flatMap(frenchMnemonicsInCode);
			expect([...new Set(left)]).toEqual([]);
		},
	);
});
