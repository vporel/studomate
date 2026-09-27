"use client";

import { LadderRole } from "@/schemas/ladder/ladder.schema";
import { ProgramType } from "@/schemas/program/program.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Chip, Typography } from "@mui/material";
import { ElementType, Fragment, useEffect } from "react";
import { useT } from "@/ui/i18n/useT";
import InclinedAccountTreeIcon from "../icons/InclinedAccountTree";
import LadderIcon from "../icons/LadderIcon";
import LadderMainIcon from "../icons/LadderMainIcon";
import CustomTreeItem from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import useProjectPrograms from "../projects/useProjectPrograms";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";
import { ExplorerItemsProps } from "./explorer-items-props";
import {
	ExplorerContextMenuEventsOutGrafcetRename,
	ExplorerContextMenuEventsOutLadderRename,
} from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";
import { LADDER_PROGRAM_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-program-drag";
import { useRenamableTreeItem } from "./useRenamableTreeItem";

/**
 * Icône par type de programme — un grafcet et un ladder partagent le même dossier
 * "Programmes" dans l'explorateur, distingués uniquement par leur icône.
 */
const PROGRAM_ICONS: Record<ProgramType, ElementType> = {
	grafcet: InclinedAccountTreeIcon,
	ladder: LadderIcon,
};

/** Le Main a sa propre icône, quel que soit son nom — c'est le point d'entrée de l'exécution. */
function getProgramIcon(
	programType: ProgramType,
	programRole?: LadderRole,
): ElementType {
	if (programType === "ladder" && programRole === "main") return LadderMainIcon;
	return PROGRAM_ICONS[programType];
}

type RenameEvent =
	| ExplorerContextMenuEventsOutGrafcetRename
	| ExplorerContextMenuEventsOutLadderRename;

const ExplorerProgramItem = ({
	programId,
	programName,
	programType,
	programRole,
	styles,
	onContextMenu,
}: ExplorerItemsProps & {
	programId: string;
	programName: string;
	programType: ProgramType;
	programRole?: LadderRole;
}) => {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const excludedFromExecution = useProjectStore(
		(state) =>
			state.project?.getProgram(programId)?.excludedFromExecution ?? false,
	);
	const tExecution = useT("common.programExecution");
	const { labelMode, startEditing, onDoubleClick, inputProps } =
		useRenamableTreeItem({
			name: programName,
			designing,
			onRename: (name) =>
				programType === "grafcet"
					? grafcetsManager.renameProgramById(programId, name)
					: laddersManager.renameProgramById(programId, name),
		});

	useEffect(() => {
		const renameEvent =
			programType === "grafcet" ? "grafcet-rename" : "ladder-rename";
		const handler = (e: RenameEvent) => {
			if (!designing) return;
			const id = "grafcetId" in e ? e.grafcetId : e.ladderId;
			if (id === programId) startEditing();
		};
		explorerContextMenuEventsOut.on(renameEvent, handler as any);
		return () => {
			explorerContextMenuEventsOut.off(renameEvent, handler as any);
		};
	}, [programId, programType, designing, startEditing]);

	const contextMenuElement: ExplorerContextMenuElement =
		programType === "grafcet"
			? { type: "grafcet", grafcetId: programId }
			: { type: "ladder", ladderId: programId };

	// Un ladder standard peut être référencé par un bloc "appel de programme" (voir BlockNode) :
	// glisser-déposer depuis ce menu vers le canevas d'un ladder. Le Main ne peut pas être appelé
	// (BlockAnalyser le refuserait) et un grafcet n'est pas une cible valide — ni l'un ni l'autre
	// n'est donc glissable. Désactivé aussi pendant l'édition du nom, pour permettre la sélection
	// de texte dans le champ sans déclencher un glisser.
	const draggableAsProgramRef =
		designing &&
		programType === "ladder" &&
		programRole !== "main" &&
		labelMode !== "edit";

	return (
		<CustomTreeItem
			key={programId}
			itemId={programId}
			label={programName}
			labelMode={labelMode}
			IconComponent={getProgramIcon(programType, programRole)}
			trailing={
				excludedFromExecution && (
					<Chip
						label={tExecution("badge")}
						size="small"
						color="warning"
						variant="outlined"
						sx={{
							ml: "auto",
							height: "18px",
							fontSize: "0.65rem",
							"& .MuiChip-label": { px: "6px" },
						}}
					/>
				)
			}
			styles={styles}
			draggable={draggableAsProgramRef}
			onDragStart={
				draggableAsProgramRef
					? (e) => {
							e.dataTransfer.setData(LADDER_PROGRAM_DRAG_MIME_TYPE, programId);
							e.dataTransfer.effectAllowed = "copy";
						}
					: undefined
			}
			onClick={() =>
				pagesManager.openPage({
					id: programId,
					type: programType,
					title: programName,
				})
			}
			onDoubleClick={onDoubleClick}
			inputProps={inputProps}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onContextMenu(e, contextMenuElement);
			}}
		/>
	);
};

const ExplorerProgramsItems = ({
	styles,
	onContextMenu,
}: ExplorerItemsProps) => {
	const t = useT("explorer");
	const programs = useProjectPrograms();

	return (
		<Fragment>
			{programs.length === 0 ? (
				<Typography
					sx={{
						padding: "3px 0 3px 33px",
						color: "gray",
						fontSize: "0.8rem",
					}}
				>
					{t("noPrograms")}
				</Typography>
			) : (
				programs.map((program) => (
					<ExplorerProgramItem
						key={program.id}
						programId={program.id}
						programName={program.name}
						programType={program.type}
						programRole={program.role}
						styles={styles}
						onContextMenu={onContextMenu}
					/>
				))
			)}
		</Fragment>
	);
};

export default ExplorerProgramsItems;
