import { existsSync } from "fs";
import { join } from "path";
import { LOCALES } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import GLOSSARY_ENTRIES, { GLOSSARY_SECTIONS } from "./glossary-entries";
import { glossaryFigureSrc } from "./glossary-view";

describe("entrées du glossaire", () => {
	it("a des identifiants uniques", () => {
		const ids = GLOSSARY_ENTRIES.map((e) => e.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("n'a pas d'entrée orpheline : chaque section est utilisée", () => {
		for (const section of GLOSSARY_SECTIONS) {
			expect(GLOSSARY_ENTRIES.some((e) => e.section === section)).toBe(true);
		}
	});

	it("ne renvoie que vers des entrées existantes, jamais vers elle-même", () => {
		const ids = new Set(GLOSSARY_ENTRIES.map((e) => e.id));
		for (const entry of GLOSSARY_ENTRIES) {
			for (const related of entry.related) {
				expect(ids.has(related)).toBe(true);
				expect(related).not.toBe(entry.id);
			}
		}
	});

	describe.each(LOCALES)("messages (%s)", (locale) => {
		const { entries, sections } = getMessages(locale).glossary;
		const byId = entries as Record<
			string,
			{ term: string; definition: string; figureAlt: string }
		>;

		it("décrit exactement les entrées déclarées", () => {
			expect(Object.keys(byId).sort()).toEqual(
				GLOSSARY_ENTRIES.map((e) => e.id).sort(),
			);
		});

		it("donne un terme et une définition à chaque entrée", () => {
			for (const { id } of GLOSSARY_ENTRIES) {
				expect(byId[id].term.trim()).not.toBe("");
				expect(byId[id].definition.trim()).not.toBe("");
			}
		});

		it("donne un texte alternatif aux seules entrées qui ont une figure", () => {
			for (const entry of GLOSSARY_ENTRIES) {
				expect(byId[entry.id].figureAlt !== "").toBe(Boolean(entry.figure));
			}
		});

		it("titre chaque section", () => {
			for (const section of GLOSSARY_SECTIONS) {
				expect(sections[section].title).not.toBe("");
			}
		});

		it("référence des figures qui existent dans public/", () => {
			for (const entry of GLOSSARY_ENTRIES) {
				if (!entry.figure) continue;
				const src = glossaryFigureSrc(
					entry.section,
					entry.figure.name,
					entry.figure.translatable,
					locale,
				);
				expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
			}
		});
	});
});
