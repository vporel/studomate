"use client";

import { useProjectContext } from "@/components/projects/ProjectContext";
import { MenuList } from "@mui/material";
import { useCallback, useState } from "react";
import { AppMenuType } from "./app-menu-bar";
import AppMenu from "./AppMenu";

const MenuBar = () => {
	const { newProject, newGrafcet, openProject, saveProject } = useProjectContext();
	const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
	const onActivate = useCallback((menuId: string) => {
		setActiveMenuId((current) => (current === menuId ? null : menuId));
	}, []);

	const onDeactivate = useCallback(() => {
		setActiveMenuId(null);
	}, []);

	const menus: AppMenuType[] = [
		{
			id: "file",
			label: "Fichier",
			items: [
				[
					{
						label: "Nouveau projet",
						// The shortcut Ctrl+N is reserved by the browser to open a new window so we don't use it
						onClick: newProject,
					},
				],
				[
					{
						label: "Ouvrir projet",
						shortcut: "Ctrl+O",
						onClick: openProject,
					},
				],
				[
					{
						label: "Enregistrer",
						shortcut: "Ctrl+S",
						onClick: saveProject,
					},
				],
				[
					{
						label: "Exporter",
						shortcut: "Ctrl+E",
					},
				],
			],
		},
		{
			id: "edit",
			label: "Edition",
			items: [
				[
					{
						label: "Annuler",
						shortcut: "Ctrl+Z",
					},
					{
						label: "Rétablir",
						shortcut: "Ctrl+Y",
					},
				],
				[
					{
						label: "Copier",
						shortcut: "Ctrl+C",
					},
					{
						label: "Coller",
						shortcut: "Ctrl+V",
					},
				],
			],
		},
		{
			id: "project",
			label: "Projet",
			items: [
				[
					{
						label: "Nouveau grafcet",
						shortcut: "Ctrl+G",
						onClick: () => {
							newGrafcet("Sans titre", { type: "A4", orientation: "portrait" });
						},
					},
				],
			],
		},
		// { id: "view", title: "Vue" },
		// { id: "help", title: "Aide" },
	];

	return (
		<MenuList
			className="menu-bar"
			sx={{
				width: "100%",
				height: "30px",
				display: "flex",
				alignItems: "center",
				gap: "8px",
				padding: "0px",
				background: "white",
				boxSizing: "border-box",
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
	);
};

export default MenuBar;
