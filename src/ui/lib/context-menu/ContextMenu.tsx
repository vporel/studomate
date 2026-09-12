"use client";

import { Box, BoxProps, Divider } from "@mui/material";
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ContextMenuItemType } from "./context-menu";
import ContextMenuItem from "./ContextMenuItem";

interface ContextMenuProps extends Omit<BoxProps<"ul">, "position"> {
	visible: boolean;
	menuItems: ContextMenuItemType[][];
	position: { x: number; y: number }; //pixels
	onClose: () => void;
	parentWidth: number; //pixels
	parentHeight: number; //pixels
}

const ContextMenu = ({
	visible,
	menuItems,
	position,
	onClose,

	parentWidth,
	parentHeight,
	...props
}: ContextMenuProps) => {
	const ref = useRef<HTMLUListElement | null>(null);
	const [internalPosition, setInternalPosition] = useState(position);
	const [menuWidth, setMenuWidth] = useState(0);
	useLayoutEffect(() => {
		if (!ref.current) return;
		const pos = { ...position };
		if (pos.x + ref.current.offsetWidth > parentWidth) {
			pos.x -= ref.current.offsetWidth;
		}
		if (pos.y + ref.current.offsetHeight > parentHeight) {
			pos.y -= ref.current.offsetHeight;
		}
		//Le menu est rendu dans un conteneur en overflow:hidden : sans borne basse,
		//un décalage vers le haut/la gauche fait sortir les premières entrées du cadre.
		pos.x = Math.max(0, pos.x);
		pos.y = Math.max(0, pos.y);
		setInternalPosition(pos);
		setMenuWidth(ref.current.offsetWidth);
	}, [position, parentWidth, parentHeight]);

	//Hide the menu when another part of the window is clicked
	useEffect(() => {
		window.addEventListener("mousedown", onClose);
		return () => {
			window.removeEventListener("mousedown", onClose);
		};
	}, [onClose]);

	return (
		visible &&
		menuItems.length > 0 && (
			<Box
				{...props}
				ref={ref}
				component="ul"
				sx={{
					...props.sx,
					position: "absolute",
					left: internalPosition.x,
					top: internalPosition.y,
					zIndex: 10,
					background: "white",
					py: "5px",
					minWidth: "180px",
					boxShadow: "1px 1px 4px rgba(0, 0, 0, .3)",
					borderRadius: "5px",
					"*": {
						textAlign: "left",
						fontSize: "0.8rem",
					},
					".item, .sub-item": {
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: "10px",
						textAlign: "left",
						position: "relative",
						py: "4px",
					},
					".item": {
						":hover": {
							".sub-items-container": {
								opacity: 1,
								visibility: "visible",
							},
						},
					},
					".right-text": {
						color: "gray",
					},
					// L'ancrage du sous-menu (gauche/droite, haut/bas), son arrondi et son plafond de
					// hauteur sont posés par `ContextMenuItem`, qui mesure si le sous-menu de cette
					// entrée déborderait du cadre.
					".sub-items-container": {
						position: "absolute",
						background: "white",
						minWidth: "160px",
						minHeight: "20px",
						border: "1px solid lightgray",
						opacity: 0,
						visibility: "hidden",
					},
				}}
			>
				{menuItems.map((group, index) => (
					<Fragment key={index}>
						{group.map((item) => (
							<ContextMenuItem
								key={item.label}
								item={item}
								hideMenu={onClose!}
								menuTop={internalPosition.y}
								menuLeft={internalPosition.x}
								menuWidth={menuWidth}
								parentWidth={parentWidth}
								parentHeight={parentHeight}
							/>
						))}
						{index < menuItems.length - 1 && (
							<Divider sx={{ my: "4px!important" }} />
						)}
					</Fragment>
				))}
			</Box>
		)
	);
};

export default ContextMenu;
