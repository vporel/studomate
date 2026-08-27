"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import {
	closestCenter,
	DndContext,
	DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
} from "@dnd-kit/sortable";
import { Box } from "@mui/material";
import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import PageTab, { PageTabProps } from "./PageTab";

const PagesTabBar = () => {
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const { pagesData, pagesOrder } = useProjectStore(
		useShallow((state) => ({
			pagesData: state.pagesData,
			pagesOrder: state.pagesOrder,
		})),
	);

	//L'ordre vient de `pagesOrder`, pas de l'ordre d'insertion des clés de `pagesData` :
	//c'est ce qui rend l'ordre des onglets explicite et donc réordonnable
	const tabsData: PageTabProps[] = useMemo(
		() =>
			pagesOrder
				.filter((id) => !!pagesData[id])
				.map((id) => ({
					id,
					title: pagesData[id].title,
					type: pagesData[id].type,
				})),
		[pagesData, pagesOrder],
	);

	// Distance minimale avant d'activer le drag : sans elle, un simple clic sur un onglet
	// (qui l'active) déclencherait un reorder involontaire.
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			const ids = tabsData.map((tab) => tab.id);
			pagesManager.reorderPages(
				arrayMove(
					ids,
					ids.indexOf(active.id as string),
					ids.indexOf(over.id as string),
				),
			);
		},
		[tabsData, pagesManager],
	);

	return (
		<Box
			className="pages__tab-bar"
			sx={{
				width: "100%",
				height: "35px",
				display: "flex",
				alignItems: "center",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
			}}
		>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={tabsData.map((tab) => tab.id)}
					strategy={horizontalListSortingStrategy}
				>
					{tabsData.map((tabData) => (
						<PageTab key={tabData.id} {...tabData} />
					))}
				</SortableContext>
			</DndContext>
		</Box>
	);
};

export default PagesTabBar;
