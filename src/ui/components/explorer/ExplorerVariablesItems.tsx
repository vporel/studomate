"use client";

import VariablesIcon from "../icons/VariablesIcon";
import { ElementType, Fragment, MouseEvent } from "react";
import { useT } from "@/ui/i18n/useT";
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
	onContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
}) => {
	const pagesManager = useProjectStore((state) => state.pagesManager);

	return (
		<CustomTreeItem
			itemId={id}
			label={label}
			IconComponent={IconComponent}
			styles={styles}
			onClick={() => pagesManager.openPage(getVariablesPageData(id))}
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
	onContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
}) => {
	const t = useT("explorer.variableGroups");
	const variablesTypes: {
		id: VariablesPageId;
		label: string;
		IconComponent?: ElementType;
	}[] = [
		{ id: "input-variables", label: t("inputs"), IconComponent: VariablesIcon },
		{
			id: "output-variables",
			label: t("outputs"),
			IconComponent: VariablesIcon,
		},
		{
			id: "memory-variables",
			label: t("memories"),
			IconComponent: VariablesIcon,
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
