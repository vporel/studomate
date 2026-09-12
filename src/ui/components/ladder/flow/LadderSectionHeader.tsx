"use client";

import SectionUpdateCommand from "@/schemas/ladder/commands/section-update.command";
import Section from "@/schemas/ladder/section.schema";
import {
	DraggableAttributes,
	DraggableSyntheticListeners,
} from "@dnd-kit/core";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LibraryAddOutlinedIcon from "@mui/icons-material/LibraryAddOutlined";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import {
	alpha,
	Box,
	IconButton,
	InputBase,
	Tooltip,
	Typography,
	useTheme,
} from "@mui/material";
import { type PointerEvent as ReactPointerEvent, useCallback } from "react";
import {
	LADDER_FLOW_MAX_ZOOM,
	LADDER_FLOW_MIN_ZOOM,
} from "@/ui/stores/ladder/managers/view.manager";
import { useT } from "@/ui/i18n/useT";
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
	const t = useT("ladderEditor.sectionHeader");
	const commandsStackManager = useLadderStore(
		(state) => state.commandsStackManager,
	);
	// Un ladder porte toujours au moins une section (voir SectionRemoveCommand.execute) : le
	// bouton se désactive plutôt que de dispatcher une commande qu'on sait invalide.
	const sectionsCount = useLadderStore((state) => state.ladder.sections.length);
	const viewManager = useLadderStore((state) => state.viewManager);
	const workflowManager = useLadderStore((state) => state.workflowManager);
	const copyCutPasteManager = useLadderStore(
		(state) => state.copyCutPasteManager,
	);
	const selected = useLadderStore((state) =>
		state.selectedSectionIds.includes(section.id),
	);
	// Le bouton « Copier » de l'en-tête ne copie que sa propre section : il se désactive dès
	// qu'une sélection multiple est active (le collage multi passe par Ctrl+C / menu Édition).
	const multipleSelected = useLadderStore(
		(state) => state.selectedSectionIds.length > 1,
	);
	const zoom = useLadderStore(
		(state) => state.zoomBySectionId[section.id] ?? 1,
	);

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
		workflowManager.deleteSections([section.id]);
	}, [section.id, workflowManager]);

	const handleDuplicateSection = useCallback(() => {
		copyCutPasteManager.duplicateSection(section.id);
	}, [section.id, copyCutPasteManager]);

	const handleCopySection = useCallback(() => {
		copyCutPasteManager.copySections([section.id]);
	}, [section.id, copyCutPasteManager]);

	// Les boutons d'action n'entrent pas dans la sélection de la section (voir
	// `useLadderSectionSelection`) : ils arrêtent la propagation du pointer-down.
	const stopSelect = useCallback(
		(e: ReactPointerEvent) => e.stopPropagation(),
		[],
	);

	return (
		<Box
			data-section-header={section.id}
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 1,
				py: 0.5,
				borderRadius: collapsed ? "6px" : "6px 6px 0 0",
				background: selected
					? alpha(
							th.palette.primary.main,
							th.palette.mode === "dark" ? 0.28 : 0.16,
						)
					: th.palette.mode === "dark"
						? "rgba(255,255,255,0.05)"
						: "rgba(0,0,0,0.04)",
				borderBottom: collapsed ? `1px solid ${th.palette.divider}` : "none",
				border: `1px solid ${
					selected ? th.palette.primary.main : th.palette.divider
				}`,
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
				aria-label={t("reorderAria")}
				aria-disabled={sectionsCount <= 1}
			>
				<DragIndicatorIcon
					fontSize="small"
					sx={{ color: th.palette.text.secondary }}
				/>
			</Box>

			<Tooltip title={collapsed ? t("expand") : t("collapse")}>
				<IconButton
					size="small"
					onPointerDown={stopSelect}
					onClick={onToggleCollapse}
					sx={{ p: 0.25 }}
					aria-label={collapsed ? t("expandAria") : t("collapseAria")}
				>
					{collapsed ? (
						<ChevronRightIcon fontSize="small" />
					) : (
						<ExpandMoreIcon fontSize="small" />
					)}
				</IconButton>
			</Tooltip>

			<Typography
				component="span"
				sx={{ fontWeight: 700, fontSize: "0.9rem", flexShrink: 0 }}
			>
				{t("number", { number: index + 1 })}
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
				inputProps={{ "aria-label": t("titleAria") }}
			/>

			{!collapsed && (
				<>
					<Tooltip title={t("zoomOut")}>
						<span>
							<IconButton
								size="small"
								onPointerDown={stopSelect}
								onClick={() => viewManager.zoomOut(section.id)}
								disabled={zoom <= LADDER_FLOW_MIN_ZOOM}
								sx={{ p: 0.25 }}
								aria-label={t("zoomOutAria")}
							>
								<ZoomOutIcon fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
					<Tooltip title={t("zoomIn")}>
						<span>
							<IconButton
								size="small"
								onPointerDown={stopSelect}
								onClick={() => viewManager.zoomIn(section.id)}
								disabled={zoom >= LADDER_FLOW_MAX_ZOOM}
								sx={{ p: 0.25 }}
								aria-label={t("zoomInAria")}
							>
								<ZoomInIcon fontSize="small" />
							</IconButton>
						</span>
					</Tooltip>
				</>
			)}

			<Tooltip title={t("copy")}>
				<span>
					<IconButton
						size="small"
						onPointerDown={stopSelect}
						onClick={handleCopySection}
						disabled={multipleSelected}
						sx={{ p: 0.25 }}
						aria-label={t("copyAria")}
					>
						<ContentCopyOutlinedIcon fontSize="small" />
					</IconButton>
				</span>
			</Tooltip>

			<Tooltip title={t("duplicate")}>
				<IconButton
					size="small"
					onPointerDown={stopSelect}
					onClick={handleDuplicateSection}
					sx={{ p: 0.25 }}
					aria-label={t("duplicateAria")}
				>
					<LibraryAddOutlinedIcon fontSize="small" />
				</IconButton>
			</Tooltip>

			<Tooltip title={t("delete")}>
				<span>
					<IconButton
						size="small"
						onPointerDown={stopSelect}
						onClick={handleDeleteSection}
						disabled={sectionsCount <= 1}
						sx={{ p: 0.25 }}
						aria-label={t("deleteAria")}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				</span>
			</Tooltip>
		</Box>
	);
}
