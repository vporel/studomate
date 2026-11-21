import type { ManualContentIndex } from "@/app/[locale]/user-manual/ManualContentIndex";
import type { FlatManualSection } from "@/app/[locale]/user-manual/manual-sections";

export const MAX_RESULTS = 15;
export const SNIPPET_RADIUS = 50;
export const MIN_QUERY_LENGTH = 2;

export type SearchResult = {
	id: string;
	label: string;
	parentLabel?: string;
	/** Content passage around the match, absent for a title-only match. */
	snippet?: string;
	matchedInLabel: boolean;
};

function findMatch(
	text: string,
	query: string,
): { index: number; length: number } | undefined {
	const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = new RegExp(escaped, "i").exec(text);
	return match ? { index: match.index, length: match[0].length } : undefined;
}

export function buildSnippet(text: string, query: string): string | undefined {
	const match = findMatch(text, query);
	if (!match) return undefined;
	const start = Math.max(0, match.index - SNIPPET_RADIUS);
	const end = Math.min(
		text.length,
		match.index + match.length + SNIPPET_RADIUS,
	);
	const prefix = start > 0 ? "…" : "";
	const suffix = end < text.length ? "…" : "";
	return `${prefix}${text.slice(start, end)}${suffix}`;
}

/** Splits a text into segments so the portion matching the query can be bolded. */
export function highlightSegments(
	text: string,
	query: string,
): { text: string; match: boolean }[] {
	if (!query) return [{ text, match: false }];
	const match = findMatch(text, query);
	if (!match) return [{ text, match: false }];
	const end = match.index + match.length;
	return [
		{ text: text.slice(0, match.index), match: false },
		{ text: text.slice(match.index, end), match: true },
		{ text: text.slice(end), match: false },
	].filter((segment) => segment.text.length > 0);
}

export default function searchManual({
	query,
	sections,
	contentIndex,
}: {
	query: string;
	sections: FlatManualSection[];
	contentIndex: ManualContentIndex;
}): SearchResult[] {
	const trimmed = query.trim();
	if (trimmed.length < MIN_QUERY_LENGTH) return [];

	const byLabel: SearchResult[] = [];
	const byContent: SearchResult[] = [];

	for (const section of sections) {
		const labelMatches =
			findMatch(section.label, trimmed) ||
			(section.parentLabel && findMatch(section.parentLabel, trimmed));
		if (labelMatches) {
			byLabel.push({ ...section, matchedInLabel: true });
			continue;
		}
		// A parent's content is only the union of its children's: matching it would
		// hide the precise sub-section already offered separately.
		if (section.hasChildren) continue;
		const text = contentIndex[section.id];
		if (text) {
			const snippet = buildSnippet(text, trimmed);
			if (snippet)
				byContent.push({ ...section, snippet, matchedInLabel: false });
		}
	}

	return [...byLabel, ...byContent].slice(0, MAX_RESULTS);
}
