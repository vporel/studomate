"use client";

import { Box, MenuItem } from "@mui/material";
import { ContextMenuItemBaseType } from "./context-menu";

const ContextMenuSubItems = ({
	subItems,
	hideMenu,
}: {
	subItems: ContextMenuItemBaseType[];
	hideMenu: () => void;
}) => {
	return (
		<Box className="sub-items-container" component="ul">
			{subItems.map((subItem) => (
				<MenuItem
					key={subItem.label}
					onMouseDown={(e) => {
						e.stopPropagation();
					}}
					onClick={() => {
						hideMenu();
						if (subItem.onClick) subItem.onClick();
					}}
					disabled={subItem.disabled}
					className={`sub-item`}
				>
					<Box component="span" className="label">
						{subItem.label}
					</Box>
					<Box component="span" className="right-text">
						{subItem.shortcut}
					</Box>
				</MenuItem>
			))}
		</Box>
	);
};

export default ContextMenuSubItems;
