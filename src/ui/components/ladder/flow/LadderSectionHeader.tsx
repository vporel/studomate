"use client";

import SectionRemoveCommand from "@/schemas/ladder/commands/section-remove.command";
import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import Section from "@/schemas/ladder/section.schema";
import {
	DraggableAttributes,
	DraggableSyntheticListeners,
} from "@dnd-kit/core";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
	Box,
	IconButton,
	InputBase,
	Typography,
	useTheme,
} from "@mui/material";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

interface LadderSectionHeaderProps {
	section: Section;
	/** Position dans `ladder.sections` — détermine le numéro affiché ("Section N:"), pas une
	 * donnée du schéma (une section n'a pas de numéro propre, seulement un ordre). */
	index: number;
	collapsed: boolean;
	onToggleCollapse: () => void;
	dragHandleAttributes: DraggableAttributes;
	dragHandleListeners: DraggableSyntheticListeners;
}

export default function LadderSectionHeader({
	section,
	index,
	collapsed,
	onToggleCollapse,
	dragHandleAttributes,
	dragHandleListeners,
}: LadderSectionHeaderProps) {
	const th = useTheme();
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	// Un ladder porte toujours au moins une section (voir SectionRemoveCommand.execute) : le
	// bouton se désactive plutôt que de dispatcher une commande qu'on sait invalide.
	const sectionsCount = useLadderStore((state) => state.ladder.sections.length);

	const handleTitleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const newTitle = e.target.value.trim();
			if (newTitle === section.title) return;
			commandsStackManager.executeOperation([
				new SectionUpdateCommand({
					sectionId: section.id,
					title: newTitle,
					previousTitle: section.title,
				}),
			]);
		},
		[section.id, section.title, commandsStackManager],
	);

	const handleDeleteSection = useCallback(() => {
		commandsStackManager.executeOperation([
			new SectionRemoveCommand({
				sectionId: section.id,
				title: section.title,
				description: section.description,
				elements: section.elements,
				connections: section.connections,
				index,
			}),
		]);
	}, [section, index, commandsStackManager]);

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 1,
				py: 0.5,
				borderRadius: collapsed ? "6px" : "6px 6px 0 0",
				background:
					th.palette.mode === "dark"
						? "rgba(255,255,255,0.05)"
						: "rgba(0,0,0,0.04)",
				borderBottom: collapsed ? `1px solid ${th.palette.divider}` : "none",
				border: `1px solid ${th.palette.divider}`,
				userSelect: "none",
			}}
		>
			<Box
				{...(sectionsCount > 1 ? dragHandleAttributes : {})}
				{...(sectionsCount > 1 ? dragHandleListeners : {})}
				sx={{
					display: "flex",
					alignItems: "center",
					cursor: sectionsCount > 1 ? "grab" : "default",
					touchAction: "none",
					opacity: sectionsCount > 1 ? 1 : 0.35,
				}}
				aria-label="Réordonner la section"
				aria-disabled={sectionsCount <= 1}
			>
				<DragIndicatorIcon
					fontSize="small"
					sx={{ color: th.palette.text.secondary }}
				/>
			</Box>

			<IconButton
				size="small"
				onClick={onToggleCollapse}
				sx={{ p: 0.25 }}
				aria-label={collapsed ? "Déplier la section" : "Replier la section"}
			>
				{collapsed ? (
					<ChevronRightIcon fontSize="small" />
				) : (
					<ExpandMoreIcon fontSize="small" />
				)}
			</IconButton>

			<Typography
				component="span"
				sx={{ fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}
			>
				Section {index + 1} :
			</Typography>

			<InputBase
				defaultValue={section.title}
				key={section.title} // reset si undo change la valeur externe
				onBlur={handleTitleBlur}
				onKeyDown={(e) => {
					if (e.key === "Enter") (e.target as HTMLInputElement).blur();
					if (e.key === "Escape") {
						(e.target as HTMLInputElement).value = section.title;
						(e.target as HTMLInputElement).blur();
					}
				}}
				sx={{
					fontWeight: 700,
					fontSize: "0.9rem",
					flex: 1,
					"& input": { p: 0, cursor: "text" },
				}}
				inputProps={{ "aria-label": "Titre de la section" }}
			/>

			<IconButton
				size="small"
				onClick={handleDeleteSection}
				disabled={sectionsCount <= 1}
				sx={{ p: 0.25 }}
				aria-label="Supprimer la section"
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Box>
	);
}
