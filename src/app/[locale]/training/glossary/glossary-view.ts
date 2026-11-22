import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import type { TrainingModuleId } from "@/training/module-ids";
import { marked } from "marked";
import { buildModuleSteps } from "../training-modules";
import trainingStepPath from "../training-paths";
import GLOSSARY_ENTRIES, {
	GLOSSARY_SECTIONS,
	type GlossarySection,
} from "./glossary-entries";
import { normalizeForSearch } from "./glossary-search";

export type GlossaryEntryView = {
	id: string;
	section: GlossarySection;
	term: string;
	aliases: string[];
	/** Definition as plain text (Markdown code marks removed). */
	definition: string;
	definitionHtml: string;
	detailsHtml: string;
	/** Normalized term: the only text the search looks at. */
	searchText: string;
	figure?: { src: string; alt: string; width: number };
	related: { id: string; term: string }[];
	lesson?: { href: string; title: string };
};

export type GlossarySectionView = {
	id: GlossarySection;
	title: string;
};

export function glossaryFigureSrc(
	section: GlossarySection,
	name: string,
	translatable: boolean,
	locale: Locale,
): string {
	const suffix = translatable && locale !== "fr" ? `-${locale}` : "";
	return `/glossary/${section}/${name}${suffix}.svg`;
}

const renderInline = (markdown: string): string =>
	markdown ? (marked.parse(markdown, { async: false }) as string) : "";

function buildLesson(
	locale: Locale,
	moduleId: TrainingModuleId,
	stepId: string,
): GlossaryEntryView["lesson"] {
	const steps = buildModuleSteps(moduleId, locale);
	const index = steps.findIndex((step) => step.id === stepId);
	if (index === -1)
		throw new Error(`Unknown training step ${moduleId}/${stepId}`);
	return {
		href: trainingStepPath(locale, moduleId, stepId, index),
		title: steps[index].title,
	};
}

/** Entries of the glossary in the given locale, sorted by term, with Markdown rendered. */
export function buildGlossaryEntries(locale: Locale): GlossaryEntryView[] {
	const { entries } = getMessages(locale).glossary;
	const messageOf = (id: string) =>
		(entries as Record<string, (typeof entries)[keyof typeof entries]>)[id];

	return GLOSSARY_ENTRIES.map((def) => {
		const message = messageOf(def.id);
		const aliases = message.aliases
			.split(";")
			.map((alias) => alias.trim())
			.filter(Boolean);
		return {
			id: def.id,
			section: def.section,
			term: message.term,
			aliases,
			definition: message.definition.replaceAll("`", ""),
			definitionHtml: renderInline(message.definition),
			detailsHtml: renderInline(message.details),
			searchText: normalizeForSearch(message.term),
			figure: def.figure && {
				src: glossaryFigureSrc(
					def.section,
					def.figure.name,
					def.figure.translatable,
					locale,
				),
				alt: message.figureAlt,
				width: def.figure.width,
			},
			related: def.related.map((id) => ({ id, term: messageOf(id).term })),
			lesson:
				def.lesson && buildLesson(locale, def.lesson.module, def.lesson.step),
		};
	}).sort((a, b) => a.term.localeCompare(b.term, locale));
}

export function buildGlossarySections(locale: Locale): GlossarySectionView[] {
	const { sections } = getMessages(locale).glossary;
	return GLOSSARY_SECTIONS.map((id) => ({ id, title: sections[id].title }));
}
