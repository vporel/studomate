"use client";

import SearchIcon from "@mui/icons-material/Search";
import {
	Box,
	ClickAwayListener,
	InputAdornment,
	List,
	ListItemButton,
	ListItemText,
	Paper,
	TextField,
	Typography,
} from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { Fragment, useMemo, useState } from "react";
import { ManualContentIndex } from "./ManualContentIndex";
import { flattenManualSections } from "./manual-sections";

const MAX_RESULTS = 15;
const SNIPPET_RADIUS = 50;

type SearchResult = {
	id: string;
	label: string;
	parentLabel?: string;
	/** Passage du contenu autour de l'occurrence trouvée, absent pour un match sur le seul titre. */
	snippet?: string;
	matchedInLabel: boolean;
};

function buildSnippet(text: string, query: string): string | undefined {
	const lowerText = text.toLowerCase();
	const at = lowerText.indexOf(query.toLowerCase());
	if (at === -1) return undefined;
	const start = Math.max(0, at - SNIPPET_RADIUS);
	const end = Math.min(text.length, at + query.length + SNIPPET_RADIUS);
	const prefix = start > 0 ? "…" : "";
	const suffix = end < text.length ? "…" : "";
	return `${prefix}${text.slice(start, end)}${suffix}`;
}

/** Découpe un texte en segments pour mettre en gras la portion correspondant à la requête. */
function highlightSegments(
	text: string,
	query: string,
): { text: string; match: boolean }[] {
	if (!query) return [{ text, match: false }];
	const at = text.toLowerCase().indexOf(query.toLowerCase());
	if (at === -1) return [{ text, match: false }];
	return [
		{ text: text.slice(0, at), match: false },
		{ text: text.slice(at, at + query.length), match: true },
		{ text: text.slice(at + query.length), match: false },
	].filter((segment) => segment.text.length > 0);
}

export default function ManualSearch({
	contentIndex,
	onSelect,
}: {
	contentIndex: ManualContentIndex;
	onSelect: (id: string) => void;
}) {
	const t = useT("manual");
	const tNavRaw = useT("manual.nav");
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const flatSections = useMemo(
		() => flattenManualSections((key) => tNavRaw(key as never)),
		[tNavRaw],
	);

	const results = useMemo<SearchResult[]>(() => {
		const trimmed = query.trim();
		if (trimmed.length < 2) return [];
		const lowerQuery = trimmed.toLowerCase();

		const byLabel: SearchResult[] = [];
		const byContent: SearchResult[] = [];

		for (const section of flatSections) {
			const labelMatches =
				section.label.toLowerCase().includes(lowerQuery) ||
				section.parentLabel?.toLowerCase().includes(lowerQuery);
			if (labelMatches) {
				byLabel.push({ ...section, matchedInLabel: true });
				continue;
			}
			// Le contenu d'un parent à sous-sections n'est que l'union de celui de ses enfants :
			// un match dessus masquerait la sous-section précise déjà proposée séparément.
			if (section.hasChildren) continue;
			const text = contentIndex[section.id];
			if (text) {
				const snippet = buildSnippet(text, trimmed);
				if (snippet)
					byContent.push({ ...section, snippet, matchedInLabel: false });
			}
		}

		return [...byLabel, ...byContent].slice(0, MAX_RESULTS);
	}, [query, flatSections, contentIndex]);

	const handleSelect = (id: string) => {
		onSelect(id);
		setQuery("");
		setOpen(false);
	};

	return (
		<ClickAwayListener onClickAway={() => setOpen(false)}>
			<Box sx={{ position: "relative", mb: 2 }}>
				<TextField
					fullWidth
					size="small"
					placeholder={t("searchPlaceholder")}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
					slotProps={{
						input: {
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon fontSize="small" />
								</InputAdornment>
							),
						},
					}}
				/>
				{open && query.trim().length >= 2 && (
					<Paper
						elevation={4}
						sx={{
							position: "absolute",
							top: "100%",
							left: 0,
							right: 0,
							mt: 0.5,
							zIndex: 10,
							maxHeight: 400,
							overflowY: "auto",
						}}
					>
						{results.length === 0 ? (
							<Typography sx={{ p: 2, color: "text.secondary" }}>
								{t("searchNoResults", { query: query.trim() })}
							</Typography>
						) : (
							<List disablePadding>
								{results.map((result) => (
									<ListItemButton
										key={result.id}
										onClick={() => handleSelect(result.id)}
									>
										<ListItemText
											primary={
												result.parentLabel
													? `${result.parentLabel} — ${result.label}`
													: result.label
											}
											secondary={
												result.snippet ? (
													<Fragment>
														{highlightSegments(
															result.snippet,
															query.trim(),
														).map((segment, i) => (
															<Box
																key={i}
																component="span"
																sx={{ fontWeight: segment.match ? 700 : 400 }}
															>
																{segment.text}
															</Box>
														))}
													</Fragment>
												) : undefined
											}
										/>
									</ListItemButton>
								))}
							</List>
						)}
					</Paper>
				)}
			</Box>
		</ClickAwayListener>
	);
}
