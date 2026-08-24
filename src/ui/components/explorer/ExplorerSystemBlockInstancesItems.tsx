"use client";

import { getTimerBlockParams } from "@/schemas/function-blocks/timer.schema";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { Fragment, MouseEvent } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import useGotoProgram from "../projects/useGotoProgram";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";

/**
 * Toutes les instances de blocs système du projet, tous ladders confondus — pas de registre
 * dédié, recalculé par parcours (voir `Project.getAllTimerBlockElements`). Feuilles simples : le
 * détail (PT/ET, variables générées) se lit sur le nœud lui-même dans le ladder, pas ici — sauf
 * via "Paramétrer" du menu contextuel, qui ouvre la même fenêtre de configuration que le
 * double-clic sur le bloc (voir `useBlockInstanceMenuItems`). Le parent (`Explorer`) ne monte ce
 * composant que s'il existe au moins une instance.
 */
const ExplorerSystemBlockInstancesItems = ({
	styles,
	onContextMenu,
}: {
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const project = useProjectStore((state) => state.project);
	const onGotoProgram = useGotoProgram();

	const instances = (project?.getAllTimerBlockElements() ?? []).flatMap(({ ladder, element }) => {
		const params = getTimerBlockParams(element);
		return params ? [{ ladder, element, params }] : [];
	});

	return (
		<Fragment>
			{instances.map(({ ladder, element, params }, index) => (
				<CustomTreeItem
					key={`${ladder.id}-${index}`}
					itemId={`system-block-instance-${ladder.id}-${index}`}
					label={params.name}
					IconComponent={TimerOutlinedIcon}
					styles={styles}
					onClick={() => onGotoProgram(ladder.id, "ladder", element.id)}
					onContextMenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onContextMenu(e, { type: "block-instance", ladderId: ladder.id, elementId: element.id });
					}}
				/>
			))}
		</Fragment>
	);
};

export default ExplorerSystemBlockInstancesItems;
