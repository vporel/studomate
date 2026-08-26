"use client";

import AnalyseButton from "@/ui/components/header/title-bar/AnalyseButton";
import ProjectModeSwitcher from "@/ui/components/header/title-bar/ProjectModeSwitcher";
import SimulationModeSelect from "@/ui/components/header/title-bar/SimulationModeSelect";
import SimulationControls from "@/ui/components/header/title-bar/SimulationControls";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { MenuList } from "@mui/material";
import { useCallback, useState } from "react";
import { AppMenuType } from "./app-menu-bar";
import AppMenu from "./AppMenu";
import useEditMenu from "./edit/useEditMenu";
import useFileMenu from "./file/useFileMenu";
import useHelpMenu from "./help/useHelpMenu";
import useProjectMenu from "./project/useProjectMenu";
import useViewMenu from "./view/useViewMenu";

const MenuBar = () => {
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const onActivate = useCallback((menuId: string) => {
		setActiveMenuId((current) => (current === menuId ? null : menuId));
	}, []);

	const onDeactivate = useCallback(() => {
		setActiveMenuId(null);
	}, []);

	const fileMenu = useFileMenu();
	const projectMenu = useProjectMenu();
	const editMenu = useEditMenu();
	const viewMenu = useViewMenu();
	const helpMenu = useHelpMenu();

	const menus: AppMenuType[] = [fileMenu, projectMenu, editMenu, viewMenu, helpMenu];

	return (
		<FlexBox centerVertical sx={{ width: "100%", justifyContent: "space-between" }}>
			<MenuList
				className="menu-bar"
				sx={{
					height: "30px",
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: "0px",
					background: "white",
				}}
			>
				{menus.map((menu) => (
					<AppMenu
						key={menu.id}
						menu={menu}
						onActivate={onActivate}
						onDeactivate={onDeactivate}
						activeMenuId={activeMenuId}
					/>
				))}
			</MenuList>
			<FlexBox centerVertical sx={{ gap: 1, px: 1 }}>
				<AnalyseButton />
				<ProjectModeSwitcher />
				<SimulationModeSelect />
				<SimulationControls />
			</FlexBox>
		</FlexBox>
	);
};

export default MenuBar;
