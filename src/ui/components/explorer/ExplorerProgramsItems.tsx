"use client";

import { ProgramType } from "@/schemas/program/program.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Typography } from "@mui/material";
import { ElementType, Fragment, MouseEvent, useCallback, useEffect, useState } from "react";
import InclinedAccountTreeIcon from "../icons/InclinedAccountTree";
import LadderIcon from "../icons/LadderIcon";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import useProjectPrograms from "../projects/useProjectPrograms";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";
import {
	ExplorerContextMenuEventsOutGrafcetRename,
	ExplorerContextMenuEventsOutLadderRename,
} from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";

/**
 * Icône par type de programme — un grafcet et un ladder partagent le même dossier
 * "Programmes" dans l'explorateur, distingués uniquement par leur icône.
 */
const PROGRAM_ICONS: Record<ProgramType, ElementType> = {
	grafcet: InclinedAccountTreeIcon,
	ladder: LadderIcon,
};

type RenameEvent =
	| ExplorerContextMenuEventsOutGrafcetRename
	| ExplorerContextMenuEventsOutLadderRename;

const ExplorerProgramItem = ({
	programId,
	programName,
	programType,
	styles,
	onContextMenu,
}: {
	programId: string;
	programName: string;
	programType: ProgramType;
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(programName);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	const saveName = useCallback(() => {
		const trimmed = editingName.trim() !== "" ? editingName.trim() : programName;
		if (programType === "grafcet") {
			grafcetsManager.renameGrafcet(programId, trimmed);
		} else {
			laddersManager.renameLadder(programId, trimmed);
		}
	}, [editingName, programId, programName, programType, grafcetsManager, laddersManager]);

	useEffect(() => {
		const renameEvent = programType === "grafcet" ? "grafcet-rename" : "ladder-rename";
		const handler = (e: RenameEvent) => {
			if (!designing) return;
			const id = "grafcetId" in e ? e.grafcetId : e.ladderId;
			if (id === programId) setLabelMode("edit");
		};
		explorerContextMenuEventsOut.on(renameEvent, handler as any);
		return () => {
			explorerContextMenuEventsOut.off(renameEvent, handler as any);
		};
	}, [programId, programType, designing]);

	const contextMenuElement: ExplorerContextMenuElement =
		programType === "grafcet"
			? { type: "grafcet", grafcetId: programId }
			: { type: "ladder", ladderId: programId };

	return (
		<CustomTreeItem
			key={programId}
			itemId={programId}
			label={programName}
			labelMode={labelMode}
			IconComponent={PROGRAM_ICONS[programType]}
			styles={styles}
			onClick={() =>
				pagesManager.openPage({
					id: programId,
					type: programType,
					title: programName,
				})
			}
			onDoubleClick={() => {
				if (!designing) return;
				setLabelMode("edit");
			}}
			inputProps={{
				value: editingName,
				onChange: (e) => setEditingName(e.target.value),
				onBlur: () => {
					setLabelMode("normal");
					saveName();
				},
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === "Escape") {
						setLabelMode("normal");
						saveName();
					}
				},
			}}
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
}: {
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
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
					Aucun programme
				</Typography>
			) : (
				programs.map((program) => (
					<ExplorerProgramItem
						key={program.id}
						programId={program.id}
						programName={program.name}
						programType={program.type}
						styles={styles}
						onContextMenu={onContextMenu}
					/>
				))
			)}
		</Fragment>
	);
};

export default ExplorerProgramsItems;
