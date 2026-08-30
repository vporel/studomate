"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import { Box, MenuItem } from "@mui/material";
import { useLayoutEffect, useRef, useState } from "react";
import FlexBox from "../boxes/FlexBox";
import { ContextMenuItemType } from "./context-menu";
import ContextMenuSubItems from "./ContextMenuSubItems";

const ContextMenuItem = ({
	item,
	hideMenu,
	menuTop,
	parentHeight,
}: {
	item: ContextMenuItemType;
	hideMenu: () => void;
	/** Position du haut du menu dans son conteneur (voir `ContextMenu`) : avec `parentHeight`, sert
	 * à savoir si le sous-menu de cette entrée déborderait du cadre en `overflow:hidden`. */
	menuTop: number;
	parentHeight: number;
}) => {
	const itemRef = useRef<HTMLLIElement>(null);
	const subRef = useRef<HTMLUListElement>(null);
	const hasSubItems = !!item.subItems && item.subItems.length > 0;

	// Sous-menu vers le bas par défaut ; vers le haut seulement s'il déborderait en bas et qu'il y a
	// plus de place au-dessus. Hauteur plafonnée à l'espace disponible de ce côté.
	const [sub, setSub] = useState({ openUp: false, maxHeight: parentHeight });
	useLayoutEffect(() => {
		if (!hasSubItems || !itemRef.current || !subRef.current) return;
		const itemTop = menuTop + itemRef.current.offsetTop;
		const roomDown = parentHeight - itemTop;
		const roomUp = itemTop + itemRef.current.offsetHeight;
		const openUp =
			subRef.current.scrollHeight > roomDown && roomUp > roomDown;
		const maxHeight = Math.max(60, openUp ? roomUp : roomDown);
		setSub((prev) =>
			prev.openUp === openUp && prev.maxHeight === maxHeight
				? prev
				: { openUp, maxHeight },
		);
	}, [hasSubItems, menuTop, parentHeight]);

	return (
		<MenuItem
			ref={itemRef}
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
				{hasSubItems ? <ChevronRightIcon /> : item.shortcut}
			</Box>
			{hasSubItems && (
				<ContextMenuSubItems
					ref={subRef}
					subItems={item.subItems!}
					hideMenu={hideMenu}
					sx={{
						top: sub.openUp ? "auto" : 0,
						bottom: sub.openUp ? 0 : "auto",
						maxHeight: sub.maxHeight,
						overflowY: "auto",
					}}
				/>
			)}
		</MenuItem>
	);
};

export default ContextMenuItem;
