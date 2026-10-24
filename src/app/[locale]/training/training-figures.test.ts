import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getMessages } from "@/i18n/messages";
import TEMPLATE_MNEMONICS_EN from "@/templates/template-mnemonics.en";
import GLOSSARY_ENTRIES from "./glossary/glossary-entries";
import { glossaryFigureSrc } from "./glossary/glossary-view";

const PUBLIC_DIR = join(process.cwd(), "public");

const FRENCH_MNEMONICS = Object.entries(TEMPLATE_MNEMONICS_EN)
	.filter(([french, english]) => french !== english)
	.map(([french]) => french);

/** Text nodes where a table word is plain prose (a colour, a position), not a mnemonic. */
const PROSE_NODES = [
	"outputs in orange",
	"(in orange)",
	"In orange:",
	"the same position",
];

function strings(value: unknown): string[] {
	if (typeof value === "string") return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value && typeof value === "object")
		return Object.values(value).flatMap(strings);
	return [];
}

function figureSources(locale: "fr" | "en"): string[] {
	const fromTraining = strings(getMessages(locale).training).flatMap((text) =>
		[...text.matchAll(/src=\\?"(\/[^"\\]+\.svg)\\?"/g)].map((m) => m[1]),
	);
	const fromGlossary = GLOSSARY_ENTRIES.flatMap((entry) =>
		entry.figure
			? [
					glossaryFigureSrc(
						entry.section,
						entry.figure.name,
						entry.figure.translatable,
						locale,
					),
				]
			: [],
	);
	return [...new Set([...fromTraining, ...fromGlossary])];
}

function textNodes(svg: string): string[] {
	return [...svg.matchAll(/<(text|title|desc)\b[^>]*>(.*?)<\/\1>/gs)].map((m) =>
		m[2].replace(/<[^>]+>/g, "").trim(),
	);
}

function frenchMnemonicsIn(node: string): string[] {
	if (PROSE_NODES.some((prose) => node.includes(prose))) return [];
	return FRENCH_MNEMONICS.filter((mnemonic) =>
		new RegExp(`(?<![\\w])${mnemonic}(?![\\w])`).test(node),
	);
}

describe("figures de la formation et du glossaire", () => {
	describe.each(["fr", "en"] as const)("%s", (locale) => {
		const sources = figureSources(locale);

		it("référence uniquement des fichiers existants", () => {
			const missing = sources.filter(
				(src) => !existsSync(join(PUBLIC_DIR, src)),
			);
			expect(missing).toEqual([]);
		});

		if (locale === "fr") {
			it("ne référence jamais une variante -en", () => {
				expect(sources.filter((src) => src.endsWith("-en.svg"))).toEqual([]);
			});
		} else {
			it("n'affiche aucun mnémonique français dans le texte des figures", () => {
				const offenders = sources.flatMap((src) => {
					const file = join(PUBLIC_DIR, src);
					if (!existsSync(file)) return [];
					return textNodes(readFileSync(file, "utf-8")).flatMap((node) =>
						frenchMnemonicsIn(node).map((m) => `${src}: ${m} (${node})`),
					);
				});
				expect(offenders).toEqual([]);
			});

			it("référence la variante -en dès qu'elle existe", () => {
				const french = sources.filter(
					(src) =>
						!src.endsWith("-en.svg") &&
						existsSync(join(PUBLIC_DIR, src.replace(/\.svg$/, "-en.svg"))),
				);
				expect(french).toEqual([]);
			});
		}
	});
});
