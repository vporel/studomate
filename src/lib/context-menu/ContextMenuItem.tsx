"use client";

import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Box, MenuItem } from "@mui/material";
import { ContextMenuItemType } from "./context-menu";
import ContextMenuSubItems from "./ContextMenuSubItems";

const ContextMenuItem = ({ item, hideMenu }: { item: ContextMenuItemType; hideMenu: () => void }) => {
	return (
		<MenuItem
			key={item.label}
			onMouseDown={(e) => {
				e.stopPropagation();
			}}
			onClick={() => {
				hideMenu();
				if (item.onClick) item.onClick();
			}}
			disabled={item.disabled}
			className={`item`}
		>
			<Box component="span" className="label">
				{item.label}
			</Box>
			<Box component="span" className="right-text">
				{item.subItems && item.subItems.length > 0 ? <ChevronRightIcon /> : item.shortcut}
			</Box>
			{item.subItems && <ContextMenuSubItems subItems={item.subItems} hideMenu={hideMenu} />}
		</MenuItem>
	);
};

export default ContextMenuItem;
