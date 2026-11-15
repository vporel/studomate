"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
	Box,
	Menu,
	MenuItem,
	MenuList,
	Paper,
	type PaperProps,
	Popper,
	Typography,
} from "@mui/material";
import {
	Fragment,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { AppMenuType } from "./app-menu-bar";

type AppMenuItem = AppMenuType["items"][number][number];
type AppSubMenu = {
	anchor: HTMLElement;
	items: NonNullable<AppMenuItem["subItems"]>;
	focusFirst: boolean;
};

const PAPER_MARKER = "data-app-menu-paper";
const PAPER_PROPS = {
	sx: { pointerEvents: "auto" },
	[PAPER_MARKER]: true,
} as PaperProps;

function ItemLabel({ item }: { item: Pick<AppMenuItem, "label" | "checked"> }) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: "5px" }}>
			<FlexBox alignItems="center" justifyContent="end" width="30px">
				{item.checked && (
					<CheckIcon fontSize="small" sx={{ transform: "translateY(-2px)" }} />
				)}
			</FlexBox>
			<Typography sx={{ fontSize: "0.85rem", py: 0, my: 0 }}>
				{item.label}
			</Typography>
		</Box>
	);
}

const ITEM_SX = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	gap: "10px",
	textAlign: "left",
	position: "relative",
	padding: "5px 20px 5px 0px",
} as const;

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
	const [subMenu, setSubMenu] = useState<AppSubMenu | null>(null);
	const open = activeMenuId === menu.id;

	const handleClose = useCallback(() => {
		onDeactivate();
	}, [onDeactivate]);

	// `anchorEl` reflète `activeMenuId` : la barre est la seule source de vérité de l'ouverture
	// (clic, survol, clavier, bascule entre menus passent tous par elle).
	useEffect(() => {
		setAnchorEl(open ? titleRef.current : null);
		if (!open) setSubMenu(null);
	}, [open]);

	// Fermeture au clic extérieur : le backdrop du `Menu` ne capte pas les clics
	// (`pointerEvents: none` sur la racine, pour garder les autres titres survolables).
	useEffect(() => {
		if (!anchorEl) return;
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!anchorEl.contains(target) && !target.closest(`[${PAPER_MARKER}]`)) {
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
				disableEnforceFocus={Boolean(subMenu)}
				slotProps={{
					root: { sx: { pointerEvents: "none" } },
					paper: PAPER_PROPS,
					list: {
						"aria-label": menu.label,
						onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
							if (e.key === "ArrowRight") {
								const opener = (e.target as HTMLElement).closest<HTMLElement>(
									"[data-submenu-parent]",
								);
								if (opener) {
									e.preventDefault();
									e.stopPropagation();
									opener.click();
									return;
								}
							}
							if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
								e.preventDefault();
								e.stopPropagation();
								onNavigate(menu.id, e.key === "ArrowRight" ? 1 : -1);
							}
						},
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
						{group.map((item, itemIndex) =>
							item.subItems ? (
								<MenuItem
									key={itemIndex}
									data-submenu-parent
									aria-haspopup="menu"
									aria-expanded={subMenu?.items === item.subItems}
									disabled={item.disabled}
									onClick={(event) =>
										setSubMenu({
											anchor: event.currentTarget,
											items: item.subItems!,
											focusFirst: event.detail === 0,
										})
									}
									onMouseEnter={(event) =>
										setSubMenu({
											anchor: event.currentTarget,
											items: item.subItems!,
											focusFirst: false,
										})
									}
									sx={ITEM_SX}
								>
									<ItemLabel item={{ label: item.label }} />
									<ChevronRightIcon fontSize="small" color="action" />
								</MenuItem>
							) : (
								<MenuItem
									key={itemIndex}
									disabled={item.disabled}
									onMouseEnter={() => setSubMenu(null)}
									onClick={() => {
										handleClose();
										item.onClick?.();
									}}
									sx={ITEM_SX}
								>
									<ItemLabel item={item} />
									<Typography
										variant="body2"
										sx={{ color: "gray", fontSize: "0.75rem" }}
									>
										{item.shortcut && `${item.shortcut}`}
									</Typography>
								</MenuItem>
							),
						)}
					</Box>
				))}
			</Menu>
			<Popper
				open={Boolean(subMenu) && Boolean(anchorEl)}
				anchorEl={subMenu?.anchor ?? null}
				placement="right-start"
				sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
			>
				<Paper elevation={8} {...PAPER_PROPS}>
					<MenuList
						autoFocusItem={subMenu?.focusFirst ?? false}
						aria-label={subMenu?.anchor.textContent ?? ""}
						onKeyDown={(e) => {
							if (e.key === "ArrowLeft") {
								e.preventDefault();
								e.stopPropagation();
								setSubMenu(null);
							} else if (e.key === "Escape") {
								e.stopPropagation();
								handleClose();
							}
						}}
					>
						{subMenu?.items.map((item, index) => (
							<MenuItem
								key={index}
								disabled={item.disabled}
								onClick={() => {
									handleClose();
									item.onClick?.();
								}}
								sx={ITEM_SX}
							>
								<ItemLabel item={item} />
							</MenuItem>
						))}
					</MenuList>
				</Paper>
			</Popper>
		</Fragment>
	);
};

export default AppMenu;
