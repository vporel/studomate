"use client";

import FlexBox from "@/lib/boxes/FlexBox";
import CheckIcon from "@mui/icons-material/Check";
import { Box, Menu, MenuItem, Typography } from "@mui/material";
import { Fragment, useCallback, useEffect, useState } from "react";
import { AppMenuType } from "./app-menu-bar";

const AppMenu = ({
	menu,
	onActivate,
	onDeactivate,
	activeMenuId,
}: {
	menu: AppMenuType;
	onActivate: (menuId: string) => void;
	onDeactivate: () => void;
	activeMenuId: string | null;
}) => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	const handleClose = useCallback(() => {
		setAnchorEl(null);
		onDeactivate();
	}, [onDeactivate]);

	useEffect(() => {
		if (activeMenuId !== menu.id) {
			setAnchorEl(null);
		}
	}, [activeMenuId, menu.id]);

	//Hide menu on click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (anchorEl && !anchorEl.contains(event.target as Node)) {
				handleClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [anchorEl, handleClose]);

	return (
		<Fragment>
			<MenuItem
				sx={{
					padding: "5px",
					fontSize: "0.85rem",
					height: "100%",
					borderRadius: "6px",
					backgroundColor: activeMenuId === menu.id ? "rgb(240,240,240)" : "transparent",
				}}
				onClick={(e) => {
					onActivate(menu.id);
					setAnchorEl(e.currentTarget);
				}}
				onMouseEnter={(e) => {
					if (activeMenuId && activeMenuId !== menu.id) {
						onActivate(menu.id);
						setAnchorEl(e.currentTarget);
					}
				}}
			>
				{menu.label}
			</MenuItem>
			<Menu
				anchorEl={anchorEl}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
				open={Boolean(anchorEl)}
				slotProps={{
					root: { sx: { pointerEvents: "none" } },
					paper: { sx: { pointerEvents: "auto" } },
				}}
			>
				{menu.items.map((group, groupIndex) => (
					<Box
						key={groupIndex}
						sx={{ borderTop: groupIndex > 0 ? "1px solid rgb(240, 240, 240)" : "none" }}
					>
						{group.map((item, itemIndex) => (
							<MenuItem
								key={itemIndex}
								onClick={() => {
									handleClose();
									item.onClick?.();
								}}
								sx={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									gap: "10px",
									textAlign: "left",
									position: "relative",
									padding: "5px 10px",
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
									<FlexBox center width="16px">
										{item.checked && <CheckIcon fontSize="small" />}
									</FlexBox>
									<Typography sx={{ fontSize: "0.85rem", py: 0, my: 0 }}>
										{item.label}
									</Typography>
								</Box>
								<Typography variant="body2" sx={{ color: "gray", fontSize: "0.75rem" }}>
									{item.shortcut && `${item.shortcut}`}
								</Typography>
							</MenuItem>
						))}
					</Box>
				))}
			</Menu>
		</Fragment>
	);
};

export default AppMenu;
