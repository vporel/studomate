"use client";

import CheckIcon from "@mui/icons-material/Check";
import { Box, MenuItem } from "@mui/material";
import FlexBox from "../boxes/FlexBox";
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
					<FlexBox centerVertical sx={{ gap: "5px" }}>
						<FlexBox alignItems="center" justifyContent="end" width="15px">
							{subItem.checked && (
								<CheckIcon fontSize="small" sx={{ transform: "translateY(-2px)" }} />
							)}
						</FlexBox>
						<Box component="span" className="label">
							{subItem.label}
						</Box>
					</FlexBox>
					<Box component="span" className="right-text">
						{subItem.shortcut}
					</Box>
				</MenuItem>
			))}
		</Box>
	);
};

export default ContextMenuSubItems;
