"use client";

import AnalyseButton from "@/ui/components/header/title-bar/AnalyseButton";
import ProjectModeSwitcher from "@/ui/components/header/title-bar/ProjectModeSwitcher";
import SimulationModeSelect from "@/ui/components/header/title-bar/SimulationModeSelect";
import SimulationControls from "@/ui/components/header/title-bar/SimulationControls";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { useCallback, useMemo, useRef, useState } from "react";
import { AppMenuType } from "./app-menu-bar";
import AppMenu from "./AppMenu";
import useEditMenu from "./edit/useEditMenu";
import useFileMenu from "./file/useFileMenu";
import useHelpMenu from "./help/useHelpMenu";
import useProjectMenu from "./project/useProjectMenu";
import useViewMenu from "./view/useViewMenu";
import ShortcutsModal from "./help/ShortcutsModal";

const MenuBar = () => {
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [shortcutsOpen, setShortcutsOpen] = useState(false);
	const titleRefs = useRef<Record<string, HTMLElement | null>>({});

	const onShortcutsOpen = useCallback(() => setShortcutsOpen(true), []);

	const fileMenu = useFileMenu();
	const projectMenu = useProjectMenu();
	const editMenu = useEditMenu();
	const viewMenu = useViewMenu();
	const helpMenu = useHelpMenu(onShortcutsOpen);

	const menus: AppMenuType[] = useMemo(
		() => [fileMenu, projectMenu, editMenu, viewMenu, helpMenu],
		[fileMenu, projectMenu, editMenu, viewMenu, helpMenu],
	);

	const registerTitleRef = useCallback(
		(menuId: string, el: HTMLElement | null) => {
			titleRefs.current[menuId] = el;
		},
		[],
	);

	const onActivate = useCallback(
		(menuId: string) => {
			setFocusedIndex(menus.findIndex((m) => m.id === menuId));
			setActiveMenuId((current) => (current === menuId ? null : menuId));
		},
		[menus],
	);

	const onOpen = useCallback(
		(menuId: string) => {
			setFocusedIndex(menus.findIndex((m) => m.id === menuId));
			setActiveMenuId(menuId);
		},
		[menus],
	);

	const onDeactivate = useCallback(() => {
		setActiveMenuId(null);
	}, []);

	const focusTitleAt = useCallback(
		(nextIndex: number) => {
			const bounded = (nextIndex + menus.length) % menus.length;
			setFocusedIndex(bounded);
			titleRefs.current[menus[bounded].id]?.focus();
		},
		[menus],
	);

	// Bascule d'un menu ouvert vers le voisin (flèches gauche/droite dans le sous-menu ouvert).
	const onNavigate = useCallback(
		(menuId: string, direction: -1 | 1) => {
			const current = menus.findIndex((m) => m.id === menuId);
			const next = (current + direction + menus.length) % menus.length;
			setFocusedIndex(next);
			setActiveMenuId(menus[next].id);
		},
		[menus],
	);

	// Navigation entre titres quand aucun menu n'est ouvert (le focus reste sur la barre).
	const onMenuBarKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowRight") {
				e.preventDefault();
				focusTitleAt(focusedIndex + 1);
			} else if (e.key === "ArrowLeft") {
				e.preventDefault();
				focusTitleAt(focusedIndex - 1);
			} else if (e.key === "Home") {
				e.preventDefault();
				focusTitleAt(0);
			} else if (e.key === "End") {
				e.preventDefault();
				focusTitleAt(menus.length - 1);
			}
		},
		[focusedIndex, focusTitleAt, menus.length],
	);

	return (
		<FlexBox
			centerVertical
			sx={{ width: "100%", justifyContent: "space-between" }}
		>
			<FlexBox
				role="menubar"
				aria-label="Menu principal"
				className="menu-bar"
				onKeyDown={onMenuBarKeyDown}
				sx={{
					height: "30px",
					alignItems: "center",
					gap: "8px",
					padding: "0px",
					background: "white",
				}}
			>
				{menus.map((menu, index) => (
					<AppMenu
						key={menu.id}
						menu={menu}
						focused={index === focusedIndex}
						activeMenuId={activeMenuId}
						onActivate={onActivate}
						onOpen={onOpen}
						onDeactivate={onDeactivate}
						onNavigate={onNavigate}
						registerTitleRef={registerTitleRef}
					/>
				))}
			</FlexBox>
			<FlexBox centerVertical sx={{ gap: 1, px: 1 }}>
				<AnalyseButton />
				<ProjectModeSwitcher />
				<SimulationModeSelect />
				<SimulationControls />
			</FlexBox>
			<ShortcutsModal
				open={shortcutsOpen}
				onClose={() => setShortcutsOpen(false)}
			/>
		</FlexBox>
	);
};

export default MenuBar;
