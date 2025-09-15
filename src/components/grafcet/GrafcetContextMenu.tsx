'use client'

import { Box, Divider, MenuItem } from "@mui/material"
import { Dimensions, useReactFlow, XYPosition } from "@xyflow/react"
import { Fragment, useEffect, useRef, useState } from "react"
import { useGrafcetPageContext } from "./GrafcetPageContext"


type MenuItemType = {
	label: string,
	shortcut?: "Ctrl+A"
	onClick: () => void,
	disabled?: boolean,
}

/**
 * 
 * @param param0 position : the position in the flow
 * @returns 
 */
const GrafcetContextMenu = ({onHide}: {onHide: () => void}) => {
	const ref = useRef<HTMLDivElement>(null)
	const {flowDimensions, contextMenuData} = useGrafcetPageContext()
	const {elementType, elementId, position, visible} = contextMenuData
	const [_position, setPosition] = useState(position)
	const {getNodes, setNodes, getEdges, setEdges} = useReactFlow()

	useEffect(() => {
		if(!ref.current) return
		const pos = {...position}
		if(pos.x + ref.current.offsetWidth > flowDimensions.width) pos.x -= ref.current.offsetWidth
		if(pos.y + ref.current.offsetHeight > flowDimensions.height) pos.y -= ref.current.offsetHeight
		setPosition(pos)
	}, [elementType, position, flowDimensions])

	//Groups of items, the groups will be separated with dividers
	let menuItems: MenuItemType[][] = []

	switch(elementType){
		case "pane": {
			menuItems = [
				[
					{
						label: "Tout sélectionner", shortcut: "Ctrl+A", 
						onClick: () => {
							setNodes(nds => nds.map(n => ({...n, selected: true})))
							setEdges(eds => eds.map(ed => ({...ed, selected: true})))
						},
						disabled: getNodes().length == 0 && getNodes().length == 0
					},
					{
						label: "Sélectionner les liaisons", 
						onClick: () => {
							setEdges(eds => eds.map(ed => ({...ed, selected: true})))
						},
						disabled: getEdges().length == 0
					}
				],
				[
					{
						label: "Exporter", 
						onClick: () => {
							
						},
						disabled: getNodes().length == 0 && getNodes().length == 0
					}
				]
			]
			break;
		}
		case "node": {
			menuItems = [
				[
					{label: "Supprimer", onClick: () => {
					
					}}
				]
			]
			break;
		}
		case "edge": {
			menuItems = [
				[
					{label: "Supprimer", onClick: () => {
					
					}}
				]
			]
			break;
		}
	}

	return (visible && menuItems.length > 0) && <Box 
		ref={ref}
		sx={{
			position: "absolute", left: _position.x, top: _position.y, zIndex: 10,
			background: "white", py: "5px", minWidth: "180px",
			boxShadow: "1px 1px 4px rgba(0, 0, 0, .3)",
			borderRadius: "5px",
			"*":{
				textAlign: "left",
				fontSize: "0.8rem",
			},
			".item": {
				display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px",
				textAlign: "left",
			},
			".shortcut": {
				color: "gray"
			}
		}}
	>
		{menuItems.map((group, index) => <Fragment key={index}>
			{group.map(item => <MenuItem 
				key={item.label} 
				onMouseDown={e => {e.stopPropagation()}}
				onClick={() => {
					onHide()
					item.onClick()
				}}
				disabled={item.disabled}
				className={`item`}
			>
				<Box component="span">{item.label}</Box>
				<Box component="span" className="shortcut">{item.shortcut}</Box>
			</MenuItem>)}
			{(index < menuItems.length - 1) && <Divider />}
		</Fragment>)}
	</Box>
}

export default GrafcetContextMenu