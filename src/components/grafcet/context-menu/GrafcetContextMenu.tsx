"use client";

import useBooleanState from "@/lib/hooks/useBooleanState";
import { ChevronRight as ChevronRightIcon } from "@mui/icons-material";
import { Box, Divider, MenuItem } from "@mui/material";
import { useReactFlow, XYPosition } from "@xyflow/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { JunctionNode } from "../flow/grafcet-nodes-definitions";
import {
	GrafcetContextMenuElement,
	GrafcetContextMenuItemType,
	GrafcetContextMenuProps,
} from "./grafcet-context-menu";
import junctionContextMenuItems from "./junction-context-menu-items";
import paneContextMenuItems from "./pane-context-menu-items";

/**
 *
 * @param param0 position : the position in the flow
 * @returns
 */
const GrafcetContextMenu = () => {
	const ref = useRef<HTMLDivElement>(null);
	const { flowDimensions, contextMenuEvents } = useGrafcetContext();
	const [element, setElement] = useState<GrafcetContextMenuElement>({ type: "pane" });
	const [visible, show, hide] = useBooleanState(false);
	const [position, setPosition] = useState<XYPosition>({ x: 0, y: 0 });
	const { getNodes, getEdges } = useReactFlow();
	const [positionShiftAxes, setPositionShiftAxes] = useState<null | "x" | "y" | "xy">(null);
	//Groups of items, the groups will be separated with dividers
	const menuItems: GrafcetContextMenuItemType[][] = useMemo(() => {
		const commonNodesItems = [[{ label: "Supprimer", onClick: () => {} }]];

		if (element.type == "pane") {
			return paneContextMenuItems(getNodes, getEdges, contextMenuEvents);
		} else if (element.type.includes("junction")) {
			return [
				...junctionContextMenuItems(element as JunctionNode, contextMenuEvents),
				...commonNodesItems,
			];
		} else {
			return commonNodesItems;
		}
	}, [element, getNodes, getEdges, contextMenuEvents]);

	//Show the menu oon 'show' event
	useEffect(() => {
		const showMenu = (props: GrafcetContextMenuProps) => {
			setElement(props.element);
			setPosition(props.position);
			show();
		};
		contextMenuEvents.on("show", showMenu);
		contextMenuEvents.on("hide", hide);
		return () => {
			contextMenuEvents.off("show", showMenu);
			contextMenuEvents.off("hide", hide);
		};
	}, [contextMenuEvents]);

	//Hide the menu when another part of the window is clicked
	useEffect(() => {
		window.addEventListener("mousedown", hide);
		return () => {
			window.removeEventListener("mousedown", hide);
		};
	}, []);

	//Check the bounds to adapt the position
	useEffect(() => {
		if (!ref.current) return;
		const pos = { ...position };
		let shiftAxes: null | "x" | "y" | "xy" = null;
		if (pos.x + ref.current.offsetWidth > flowDimensions.width) {
			pos.x -= ref.current.offsetWidth;
			shiftAxes = "x";
		}
		if (pos.y + ref.current.offsetHeight > flowDimensions.height) {
			pos.y -= ref.current.offsetHeight;
			shiftAxes = shiftAxes === null ? "y" : "xy";
		}
		if (shiftAxes !== null) setPosition(pos);
		setPositionShiftAxes(shiftAxes);
	}, [element, position, flowDimensions]);

	return (
		visible &&
		menuItems.length > 0 && (
			<Box
				ref={ref}
				component="ul"
				sx={{
					position: "absolute",
					left: position.x,
					top: position.y,
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
					".sub-items-container": {
						position: "absolute",
						left: !positionShiftAxes?.includes("x") ? "100%" : "auto",
						right: positionShiftAxes?.includes("x") ? "100%" : "auto",
						top: !positionShiftAxes?.includes("y") ? "0" : "auto",
						bottom: positionShiftAxes?.includes("y") ? "0" : "auto",
						background: "white",
						minWidth: "160px",
						minHeight: "20px",
						border: "1px solid lightgray",
						borderRadius: !positionShiftAxes?.includes("x") ? "0 5px 5px 0" : "5px 0 0 5px",
						opacity: 0,
						visibility: "hidden",
					},
				}}
			>
				{menuItems.map((group, index) => (
					<Fragment key={index}>
						{group.map((item) => (
							<MenuItem
								key={item.label}
								onMouseDown={(e) => {
									e.stopPropagation();
								}}
								onClick={() => {
									hide();
									if (item.onClick) item.onClick();
								}}
								disabled={item.disabled}
								className={`item`}
							>
								<Box component="span" className="label">
									{item.label}
								</Box>
								<Box component="span" className="right-text">
									{item.subItems && item.subItems.length > 0 ? (
										<ChevronRightIcon />
									) : (
										item.shortcut
									)}
								</Box>
								{item.subItems && (
									<Box className="sub-items-container" component="ul">
										{item.subItems.map((subItem) => (
											<MenuItem
												key={subItem.label}
												onMouseDown={(e) => {
													e.stopPropagation();
												}}
												onClick={() => {
													hide();
													if (subItem.onClick) subItem.onClick();
												}}
												disabled={subItem.disabled}
												className={`sub-item`}
											>
												<Box component="span" className="label">
													{subItem.label}
												</Box>
												<Box component="span" className="right-text">
													{subItem.shortcut}
												</Box>
											</MenuItem>
										))}
									</Box>
								)}
							</MenuItem>
						))}
						{index < menuItems.length - 1 && <Divider />}
					</Fragment>
				))}
			</Box>
		)
	);
};

export default GrafcetContextMenu;
