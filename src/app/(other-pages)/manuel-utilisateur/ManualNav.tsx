"use client";

import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

type Section = {
	id: string;
	label: string;
	children?: { id: string; label: string }[];
};

const SECTIONS: Section[] = [
	{ id: "intro", label: "Introduction" },
	{ id: "getting-started", label: "Démarrer" },
	{
		id: "grafcet",
		label: "Grafcet",
		children: [
			{ id: "grafcet-steps", label: "Étapes" },
			{ id: "grafcet-actions", label: "Actions" },
			{ id: "grafcet-transitions", label: "Transitions" },
		],
	},
	{ id: "projects", label: "Projets" },
	{ id: "toolbar", label: "Barre d'outils" },
	{ id: "explorer", label: "Explorateur" },
	{ id: "variables", label: "Variables" },
];

export default function ManualNav({
	selected,
	onSelect,
}: {
	selected?: string;
	onSelect?: (id: string) => void;
}) {
	const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

	useEffect(() => {
		// expand parent when a child is selected
		if (selected?.startsWith("grafcet")) {
			setOpenMap((m) => ({ ...m, grafcet: true }));
		}
	}, [selected]);

	return (
		<Box sx={{ width: 260, pr: 2 }}>
			<Typography variant="h6" gutterBottom>
				Plan du manuel
			</Typography>
			<List disablePadding>
				{SECTIONS.map((s) => {
					const hasChildren = Array.isArray(s.children) && s.children.length > 0;
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
									if (hasChildren) setOpenMap((m) => ({ ...m, [s.id]: !m[s.id] }));
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
