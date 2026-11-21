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
import searchManual, { highlightSegments } from "./manual-search";

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

	const results = useMemo(
		() => searchManual({ query, sections: flatSections, contentIndex }),
		[query, flatSections, contentIndex],
	);

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
