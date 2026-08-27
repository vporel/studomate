"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import { Box, MenuItem } from "@mui/material";
import FlexBox from "../boxes/FlexBox";
import { ContextMenuItemType } from "./context-menu";
import ContextMenuSubItems from "./ContextMenuSubItems";

const ContextMenuItem = ({
	item,
	hideMenu,
}: {
	item: ContextMenuItemType;
	hideMenu: () => void;
}) => {
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
			className="item"
			sx={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "10px",
				textAlign: "left",
				position: "relative",
				padding: "5px 20px 5px 0px",
			}}
		>
			<FlexBox centerVertical sx={{ gap: "5px" }}>
				<FlexBox alignItems="center" justifyContent="end" width="25px">
					{item.checked && (
						<CheckIcon
							fontSize="small"
							sx={{ transform: "translateY(-2px)" }}
						/>
					)}
				</FlexBox>
				<Box component="span" className="label">
					{item.label}
				</Box>
			</FlexBox>
			<Box component="span" className="right-text">
				{item.subItems && item.subItems.length > 0 ? (
					<ChevronRightIcon />
				) : (
					item.shortcut
				)}
			</Box>
			{item.subItems && (
				<ContextMenuSubItems subItems={item.subItems} hideMenu={hideMenu} />
			)}
		</MenuItem>
	);
};

export default ContextMenuItem;
