"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
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
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	WheelEvent as ReactWheelEvent,
} from "react";
import { useShallow } from "zustand/shallow";
import PageTab, { PageTabProps } from "./PageTab";

const EDGE_FADE_PX = 28;

/**
 * Masque en dégradé estompant le bord gauche et/ou droit de la barre d'onglets quand des
 * onglets restent hors champ de ce côté — signal visuel de scrollabilité, la scrollbar native
 * étant masquée. `undefined` quand tout tient dans la largeur (aucun masque appliqué).
 */
export function edgeFadeMask(
	overflowStart: boolean,
	overflowEnd: boolean,
): string | undefined {
	if (!overflowStart && !overflowEnd) return undefined;
	const start = overflowStart
		? `transparent, black ${EDGE_FADE_PX}px`
		: "black";
	const end = overflowEnd
		? `black calc(100% - ${EDGE_FADE_PX}px), transparent`
		: "black";
	return `linear-gradient(to right, ${start}, ${end})`;
}

const PagesTabBar = () => {
	const t = useT("pages.tabBar");
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

	const scrollRef = useRef<HTMLDivElement>(null);
	const [overflow, setOverflow] = useState({ start: false, end: false });

	const syncOverflow = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const start = el.scrollLeft > 1;
		const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
		setOverflow((prev) =>
			prev.start === start && prev.end === end ? prev : { start, end },
		);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		syncOverflow();
		el.addEventListener("scroll", syncOverflow, { passive: true });
		const observer =
			typeof ResizeObserver !== "undefined"
				? new ResizeObserver(syncOverflow)
				: null;
		observer?.observe(el);
		return () => {
			el.removeEventListener("scroll", syncOverflow);
			observer?.disconnect();
		};
	}, [syncOverflow]);

	useEffect(() => {
		syncOverflow();
	}, [tabsData.length, syncOverflow]);

	// Molette verticale → défilement horizontal de la barre (sans scrollbar visible, un
	// utilisateur souris n'aurait sinon aucun moyen d'atteindre les onglets hors champ).
	const handleWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
		const el = scrollRef.current;
		if (!el || e.deltaY === 0) return;
		el.scrollLeft += e.deltaY;
	}, []);

	const fadeMask = edgeFadeMask(overflow.start, overflow.end);

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
			ref={scrollRef}
			className="pages__tab-bar"
			role="tablist"
			aria-label={t("ariaLabel")}
			onWheel={handleWheel}
			sx={{
				width: "100%",
				height: "35px",
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				overflowX: "auto",
				overflowY: "hidden",
				// Scrollbar native masquée : dans une barre de 35 px elle rognerait la hauteur des
				// onglets. Défilement via molette (`handleWheel`), trackpad et drag-and-drop.
				scrollbarWidth: "none",
				"&::-webkit-scrollbar": { display: "none" },
				maskImage: fadeMask,
				WebkitMaskImage: fadeMask,
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
