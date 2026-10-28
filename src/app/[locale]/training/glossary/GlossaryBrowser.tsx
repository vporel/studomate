"use client";

import SearchIcon from "@mui/icons-material/Search";
import {
	Box,
	Chip,
	InputAdornment,
	Link as MuiLink,
	Paper,
	Stack,
	TextField,
	Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { matchesQuery } from "./glossary-search";
import type { GlossaryEntryView, GlossarySectionView } from "./glossary-view";

export type GlossaryLabels = {
	searchLabel: string;
	searchPlaceholder: string;
	filterLabel: string;
	filterAll: string;
	noResults: string;
	aliasesLabel: string;
	relatedLabel: string;
	resultsOne: string;
	/** Contains `{count}`, replaced by the number of displayed entries. */
	resultsOther: string;
};

type Props = {
	sections: GlossarySectionView[];
	entries: GlossaryEntryView[];
	labels: GlossaryLabels;
};

const ALL = "all";

function EntryCard({
	entry,
	sectionTitle,
	labels,
}: {
	entry: GlossaryEntryView;
	sectionTitle: string;
	labels: Props["labels"];
}) {
	return (
		<Paper
			variant="outlined"
			component="article"
			sx={{ p: 2.5, borderRadius: 3, scrollMarginTop: 80 }}
			id={entry.id}
		>
			<Stack
				direction="row"
				justifyContent="space-between"
				alignItems="center"
				gap={1}
			>
				<Typography variant="h5" component="h2" fontWeight={700}>
					{entry.term}
				</Typography>
				<Chip label={sectionTitle} size="small" variant="outlined" />
			</Stack>
			{entry.aliases.length > 0 && (
				<Typography variant="body2" color="text.secondary" mt={0.5}>
					{labels.aliasesLabel} : {entry.aliases.join(", ")}
				</Typography>
			)}
			<Box
				mt={1.5}
				sx={{
					"& p": { my: 1, lineHeight: 1.7 },
					"& code": {
						backgroundColor: "rgba(0, 0, 0, 0.06)",
						borderRadius: "4px",
						px: "4px",
						fontSize: "0.9em",
					},
				}}
				dangerouslySetInnerHTML={{
					__html: entry.definitionHtml + entry.detailsHtml,
				}}
			/>
			{entry.figure && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={entry.figure.src}
					alt={entry.figure.alt}
					width={entry.figure.width}
					style={{ maxWidth: "100%", height: "auto", display: "block" }}
				/>
			)}
			{entry.related.length > 0 && (
				<Typography variant="body2" color="text.secondary" mt={1.5}>
					{labels.relatedLabel} :{" "}
					{entry.related.map((related, index) => (
						<span key={related.id}>
							{index > 0 && ", "}
							<MuiLink href={`#${related.id}`}>{related.term}</MuiLink>
						</span>
					))}
				</Typography>
			)}
		</Paper>
	);
}

export default function GlossaryBrowser({ sections, entries, labels }: Props) {
	const [query, setQuery] = useState("");
	const [section, setSection] = useState<string>(ALL);

	const sectionTitles = useMemo(
		() =>
			Object.fromEntries(
				sections.map(({ id, title }) => [id, title]),
			) as Record<GlossaryEntryView["section"], string>,
		[sections],
	);

	const visible = useMemo(
		() =>
			entries.filter(
				(entry) =>
					(section === ALL || entry.section === section) &&
					matchesQuery(entry.searchText, query),
			),
		[entries, query, section],
	);

	return (
		<>
			<TextField
				fullWidth
				type="search"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				label={labels.searchLabel}
				placeholder={labels.searchPlaceholder}
				slotProps={{
					input: {
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon />
							</InputAdornment>
						),
					},
				}}
			/>
			<Stack
				direction="row"
				gap={1}
				flexWrap="wrap"
				mt={2}
				role="group"
				aria-label={labels.filterLabel}
			>
				{[{ id: ALL, title: labels.filterAll }, ...sections].map((item) => (
					<Chip
						key={item.id}
						label={item.title}
						clickable
						color={section === item.id ? "primary" : "default"}
						variant={section === item.id ? "filled" : "outlined"}
						aria-pressed={section === item.id}
						onClick={() => setSection(item.id)}
					/>
				))}
			</Stack>
			<Typography
				variant="body2"
				color="text.secondary"
				mt={2}
				role="status"
				aria-live="polite"
			>
				{visible.length === 1
					? labels.resultsOne
					: labels.resultsOther.replace("{count}", String(visible.length))}
			</Typography>

			{visible.length === 0 && (
				<Typography mt={3}>{labels.noResults}</Typography>
			)}

			<Stack gap={2} mt={3}>
				{visible.map((entry) => (
					<EntryCard
						key={entry.id}
						entry={entry}
						sectionTitle={sectionTitles[entry.section]}
						labels={labels}
					/>
				))}
			</Stack>
		</>
	);
}
