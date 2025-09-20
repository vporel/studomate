'use client'

import { Box, MenuItem, Typography } from "@mui/material"
import { DownloadButton } from "./file/Export";

const MenuBar = () => {

	const menuItems = [
		{ id: "file", title: "Fichier" },
		{ id: "edit", title: "Edition" },
		{ id: "view", title: "Vue" },
		{ id: "help", title: "Aide" },
	];

	return (
		<Box className="menu-bar" sx={{
			width: "100%", height: "40px",
			borderBottom: "1px solid lightgray",
			display: "flex", justifyContent: "space-between", alignItems: "center",
			padding: "0px", background: "#efefff",
			boxSizing: "border-box",
		}}>
			<Box sx={{
				display: "flex", alignItems: "center",
				height: "100%",
			}}>
				{menuItems.map(item => <MenuItem key={item.id}>{item.title}</MenuItem>)}
			</Box>
			<Box sx={{display: "flex", alignContent: "center", justifyContent: "end", gap: 1}}>
				<DownloadButton objectId="page-1"/>
				<Typography sx={{padding: "0px 10px"}}>Project name</Typography>
			</Box>
		</Box>
	)
}

export default MenuBar