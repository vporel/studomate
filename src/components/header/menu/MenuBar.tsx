"use client";

import { Box, MenuItem } from "@mui/material";

const MenuBar = () => {
	const menuItems = [
		{ id: "file", title: "Fichier" },
		{ id: "edit", title: "Edition" },
		{ id: "view", title: "Vue" },
		{ id: "help", title: "Aide" },
	];

	return (
		<Box
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
			{menuItems.map((item) => (
				<MenuItem
					key={item.id}
					sx={{
						padding: "5px",
						fontSize: "0.9rem",
						height: "100%",
						borderRadius: "6px",
					}}
				>
					{item.title}
				</MenuItem>
			))}
		</Box>
	);
};

export default MenuBar;
