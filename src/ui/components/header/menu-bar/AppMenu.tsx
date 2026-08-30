"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import CheckIcon from "@mui/icons-material/Check";
import { Box, Menu, MenuItem, Typography } from "@mui/material";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { AppMenuType } from "./app-menu-bar";

const AppMenu = ({
	menu,
	focused,
	activeMenuId,
	onActivate,
	onOpen,
	onDeactivate,
	onNavigate,
	registerTitleRef,
}: {
	menu: AppMenuType;
	focused: boolean;
	activeMenuId: string | null;
	onActivate: (menuId: string) => void;
	onOpen: (menuId: string) => void;
	onDeactivate: () => void;
	onNavigate: (menuId: string, direction: -1 | 1) => void;
	registerTitleRef: (menuId: string, el: HTMLElement | null) => void;
}) => {
	const titleRef = useRef<HTMLElement | null>(null);
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const open = activeMenuId === menu.id;

	const handleClose = useCallback(() => {
		onDeactivate();
	}, [onDeactivate]);

	// `anchorEl` reflète `activeMenuId` : la barre est la seule source de vérité de l'ouverture
	// (clic, survol, clavier, bascule entre menus passent tous par elle).
	useEffect(() => {
		setAnchorEl(open ? titleRef.current : null);
	}, [open]);

	// Fermeture au clic extérieur : le backdrop du `Menu` ne capte pas les clics
	// (`pointerEvents: none` sur la racine, pour garder les autres titres survolables).
	useEffect(() => {
		if (!anchorEl) return;
		const handleClickOutside = (event: MouseEvent) => {
			if (!anchorEl.contains(event.target as Node)) {
				handleClose();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [anchorEl, handleClose]);

	const setTitleRef = useCallback(
		(el: HTMLElement | null) => {
			titleRef.current = el;
			registerTitleRef(menu.id, el);
		},
		[menu.id, registerTitleRef],
	);

	return (
		<Fragment>
			<MenuItem
				ref={setTitleRef}
				component="div"
				aria-haspopup="true"
				aria-expanded={open}
				tabIndex={focused ? 0 : -1}
				sx={{
					padding: "5px",
					fontSize: "0.85rem",
					height: "100%",
					borderRadius: "6px",
					backgroundColor: open ? "rgb(240,240,240)" : "transparent",
				}}
				onClick={() => onActivate(menu.id)}
				onMouseEnter={() => {
					if (activeMenuId && activeMenuId !== menu.id) {
						onOpen(menu.id);
					}
				}}
				onKeyDown={(e) => {
					// Entrée/Espace sont déjà transformés en clic par ButtonBase (→ `onActivate`).
					if (e.key === "ArrowDown" || e.key === "ArrowUp") {
						e.preventDefault();
						onOpen(menu.id);
					}
				}}
			>
				{menu.label}
			</MenuItem>
			<Menu
				anchorEl={anchorEl}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
				open={Boolean(anchorEl)}
				onClose={handleClose}
				slotProps={{
					root: { sx: { pointerEvents: "none" } },
					paper: { sx: { pointerEvents: "auto" } },
					list: { "aria-label": menu.label },
				}}
				MenuListProps={{
					onKeyDown: (e) => {
						if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
							e.preventDefault();
							e.stopPropagation();
							onNavigate(menu.id, e.key === "ArrowRight" ? 1 : -1);
						}
					},
				}}
			>
				{menu.items.map((group, groupIndex) => (
					<Box
						key={groupIndex}
						sx={{
							borderTop:
								groupIndex > 0 ? "1px solid rgb(240, 240, 240)" : "none",
						}}
					>
						{group.map((item, itemIndex) => (
							<MenuItem
								key={itemIndex}
								disabled={item.disabled}
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
									padding: "5px 20px 5px 0px",
								}}
							>
								<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
									<FlexBox
										alignItems="center"
										justifyContent="end"
										width="30px"
									>
										{item.checked && (
											<CheckIcon
												fontSize="small"
												sx={{ transform: "translateY(-2px)" }}
											/>
										)}
									</FlexBox>
									<Typography sx={{ fontSize: "0.85rem", py: 0, my: 0 }}>
										{item.label}
									</Typography>
								</Box>
								<Typography
									variant="body2"
									sx={{ color: "gray", fontSize: "0.75rem" }}
								>
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
