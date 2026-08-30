"use client";

import CheckIcon from "@mui/icons-material/Check";
import { Box, Divider, MenuItem, SxProps, Theme } from "@mui/material";
import { forwardRef } from "react";
import FlexBox from "../boxes/FlexBox";
import { ContextMenuSubItemType } from "./context-menu";

const ContextMenuSubItems = forwardRef<
	HTMLUListElement,
	{
		subItems: ContextMenuSubItemType[];
		hideMenu: () => void;
		/** Ancrage vertical et plafond de hauteur, calculés par `ContextMenuItem`. */
		sx?: SxProps<Theme>;
	}
>(({ subItems, hideMenu, sx }, ref) => {
	return (
		<Box ref={ref} className="sub-items-container" component="ul" sx={sx}>
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
									<CheckIcon
										fontSize="small"
										sx={{ transform: "translateY(-2px)" }}
									/>
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
});
ContextMenuSubItems.displayName = "ContextMenuSubItems";

export default ContextMenuSubItems;
