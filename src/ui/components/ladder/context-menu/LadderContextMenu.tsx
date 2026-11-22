"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import useProjectClipboard from "@/ui/components/projects/useProjectClipboard";
import { useT } from "@/ui/i18n/useT";
import type { MenuTranslate } from "@/ui/lib/context-menu/context-menu";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import ContextMenu from "@/ui/lib/context-menu/ContextMenu";
import useContextMenuBus from "@/ui/lib/context-menu/useContextMenuBus";
import useBooleanState from "@/ui/lib/hooks/useBooleanState";
import useExportProgramPdf from "@/ui/pdf/useExportProgramPdf";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import { OnDelete, XYPosition } from "@xyflow/react";
import { useCallback, useMemo, useState } from "react";
import { useLadderContext, useLadderStore } from "../context/LadderContext";
import {
	LadderContextMenuElement,
	LadderContextMenuProps,
} from "./ladder-context-menu";
import nodeOrEdgeContextMenuItems from "./node-or-edge-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";

const LadderContextMenu = ({
	flowDimensions,
	sectionId,
	handleDelete,
}: {
	flowDimensions: { width: number; height: number };
	sectionId: string;
	handleDelete: OnDelete;
}) => {
	const { contextMenuEvents } = useLadderContext();
	const ladder = useLadderStore((state) => state.ladder);
	const workflowManager = useLadderStore((state) => state.workflowManager);
	const copyCutPasteManager = useLadderStore(
		(state) => state.copyCutPasteManager,
	);
	// Le menu du flow ne colle que des éléments : un presse-papiers contenant une section
	// entière se colle par Ctrl+V ou le menu Édition, pas ici.
	const canPaste = useProjectClipboard(
		(s) =>
			s.entry?.scope === "ladder" &&
			(s.entry.data as { kind?: string })?.kind === "elements",
	);
	const canEdit = useCanEditActivePage();
	const canExport = useProjectStore((s) => s.capabilities.export);
	const getExportConfig = useCallback(
		(): PdfExportProgramConfig => ({ type: "ladder", program: ladder }),
		[ladder],
	);
	const onExport = useExportProgramPdf(getExportConfig);
	const setCrossReferenceFilter = useProjectStore(
		(s) => s.setCrossReferenceFilter,
	);
	const setCrossReferenceResultVisible = useProjectStore(
		(s) => s.setCrossReferenceResultVisible,
	);
	const openCrossReferences = useCallback(
		(variable: string) => {
			setCrossReferenceFilter(variable);
			setCrossReferenceResultVisible(true);
		},
		[setCrossReferenceFilter, setCrossReferenceResultVisible],
	);
	const [element, setElement] = useState<LadderContextMenuElement>({
		type: "pane",
	});
	const [visible, show, hide] = useBooleanState(false);
	const tRaw = useT("ladderEditor.contextMenu");
	const t = useMemo<MenuTranslate>(
		() => (key, values) => tRaw(key as never, values as never),
		[tRaw],
	);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });
	const [screenPosition, setScreenPosition] = useState<XYPosition>({
		x: 0,
		y: 0,
	});

	const menuItems: ContextMenuItemType[][] = useMemo(() => {
		if (element.type === "pane") {
			return paneContextMenuItems(
				workflowManager,
				sectionId,
				copyCutPasteManager,
				screenPosition,
				canPaste,
				t,
				canExport ? onExport : null,
				ladder.getAllElements().length === 0,
			);
		}
		const items: ContextMenuItemType[][] = [];
		items.push(
			...nodeOrEdgeContextMenuItems(
				element,
				sectionId,
				handleDelete,
				copyCutPasteManager,
				workflowManager,
				openCrossReferences,
				t,
			),
		);
		return items;
	}, [
		element,
		ladder,
		workflowManager,
		copyCutPasteManager,
		canPaste,
		screenPosition,
		sectionId,
		handleDelete,
		onExport,
		canExport,
		openCrossReferences,
		t,
	]);

	const showMenu = useCallback(
		(props: LadderContextMenuProps) => {
			// Bus mitt partagé par toutes les sections : n'afficher que dans la section cliquée, et
			// refermer les menus des autres sections.
			if (props.sectionId !== sectionId) {
				hide();
				return;
			}
			if (props.element.type === "pane" && !canEdit && !canExport) return;
			setElement(props.element);
			setPosition(props.position);
			setScreenPosition(props.screenPosition);
			show();
		},
		[hide, show, sectionId, canEdit, canExport],
	);
	useContextMenuBus(contextMenuEvents, showMenu, hide);

	return (
		<ContextMenu
			visible={visible}
			position={position}
			menuItems={menuItems}
			onClose={hide}
			parentWidth={flowDimensions.width}
			parentHeight={flowDimensions.height}
		/>
	);
};

export default LadderContextMenu;
