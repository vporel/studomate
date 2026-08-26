"use client";

import CheckIcon from "@mui/icons-material/Check";
import { Box, Divider, MenuItem } from "@mui/material";
import FlexBox from "../boxes/FlexBox";
import { ContextMenuSubItemType } from "./context-menu";

const ContextMenuSubItems = ({
	subItems,
	hideMenu,
}: {
	subItems: ContextMenuSubItemType[];
	hideMenu: () => void;
}) => {
	return (
		<Box className="sub-items-container" component="ul">
			{subItems.map((subItem, index) =>
				"divider" in subItem ? (
					<Divider key={`divider-${index}`} sx={{ my: "4px!important" }} />
				) : (
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
				),
			)}
		</Box>
	);
};

export default ContextMenuSubItems;
