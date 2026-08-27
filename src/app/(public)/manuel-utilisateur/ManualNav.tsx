"use client";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
	Box,
	List,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { MANUAL_SECTIONS } from "./manual-sections";

export default function ManualNav({
	selected,
	onSelect,
}: {
	selected?: string;
	onSelect?: (id: string) => void;
}) {
	const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!selected) return;
		// Déplie le parent dont un enfant est sélectionné (ex : lien direct vers une sous-section).
		const parent = MANUAL_SECTIONS.find((s) =>
			s.children?.some((c) => c.id === selected),
		);
		if (parent) setOpenMap((m) => ({ ...m, [parent.id]: true }));
	}, [selected]);

	return (
		<Box sx={{ width: "100%", pr: 2 }}>
			<Typography variant="h6" gutterBottom>
				Plan du manuel
			</Typography>
			<List disablePadding>
				{MANUAL_SECTIONS.map((s) => {
					const hasChildren =
						Array.isArray(s.children) && s.children.length > 0;
					const isOpen = Boolean(openMap[s.id]);

					return (
						<React.Fragment key={s.id}>
							<ListItemButton
								component="a"
								href={`#${s.id}`}
								selected={selected === s.id}
								onClick={(e) => {
									e.preventDefault();
									onSelect?.(s.id);
									if (hasChildren)
										setOpenMap((m) => ({ ...m, [s.id]: !m[s.id] }));
								}}
							>
								<ListItemText primary={s.label} />
								{hasChildren && (
									<ListItemIcon sx={{ minWidth: 36 }}>
										{isOpen ? <ExpandLess /> : <ExpandMore />}
									</ListItemIcon>
								)}
							</ListItemButton>

							{hasChildren &&
								isOpen &&
								s.children!.map((c) => (
									<ListItemButton
										key={c.id}
										component="a"
										href={`#${c.id}`}
										sx={{ pl: 4 }}
										selected={selected === c.id}
										onClick={(e) => {
											e.preventDefault();
											onSelect?.(c.id);
										}}
									>
										<ListItemText primary={c.label} />
									</ListItemButton>
								))}
						</React.Fragment>
					);
				})}
			</List>
		</Box>
	);
}
