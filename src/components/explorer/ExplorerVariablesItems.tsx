"use client";

import { Segment as SegmentIcon } from "@mui/icons-material";
import { ElementType, Fragment, MouseEvent } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { getVariablesPageData, VariablesPageId } from "../pages/VariablesPage";
import { useProjectStore } from "../projects/ProjectContext";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";

const ExplorerVariablesItem = ({
	id,
	label,
	IconComponent,
	styles,
	onContextMenu,
}: {
	id: VariablesPageId;
	label: string;
	IconComponent?: ElementType;
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const openPage = useProjectStore((state) => state.openPage);

	return (
		<CustomTreeItem
			itemId={id}
			label={label}
			IconComponent={IconComponent}
			styles={styles}
			onClick={() => openPage(getVariablesPageData(id))}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onContextMenu(e, { type: "variables", variablesPageId: id });
			}}
		/>
	);
};

const ExplorerVariablesItems = ({
	styles,
	onContextMenu,
}: {
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const variablesTypes: {
		id: VariablesPageId;
		label: string;
		IconComponent?: ElementType;
	}[] = [
		{ id: "input-variables", label: "Entrées", IconComponent: SegmentIcon },
		{
			id: "output-variables",
			label: "Sorties",
			IconComponent: SegmentIcon,
		},
		{
			id: "memory-variables",
			label: "Mémoires",
			IconComponent: SegmentIcon,
		},
	];

	return (
		<Fragment>
			{variablesTypes.map((v) => (
				<ExplorerVariablesItem
					key={v.id}
					id={v.id}
					label={v.label}
					IconComponent={v.IconComponent}
					styles={styles}
					onContextMenu={onContextMenu}
				/>
			))}
		</Fragment>
	);
};

export default ExplorerVariablesItems;
