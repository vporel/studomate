'use client'

import { useReactFlow, useStore } from "@xyflow/react"
import { pointToRendererPoint, XYPosition } from "@xyflow/system"
import React, { useMemo, useState } from "react"
import { getSvgPathFromStroke } from "../utils"

type NodePoints = Array<[number, number] | [number, number, number]>
type NodesPointsObject = Record<string, NodePoints>


type SelectorStyle= {
	fill: string, stroke: string,
	rectangle: {
		rightLeft: {fill: string, stroke: string}
	}
}

/**
 * This hooks has been made to override some functions
 * Example : screenToFlowPosition in order ot prevent the selection from fitting the snapgrid
 * @returns 
 */
function useCustomViewportHelper(){
	const { transform, domNode } = useStore(state => ({transform: state.transform, domNode: state.domNode}))

	return useMemo(() => ({
		screenToFlowPosition: (clientPosition: XYPosition) => {
			if (!domNode) return clientPosition;
			const { x: domX, y: domY } = domNode.getBoundingClientRect();
			const correctedPosition = { x: clientPosition.x - domX, y: clientPosition.y - domY };
			return pointToRendererPoint(correctedPosition, transform);
		}
	}), [transform, domNode])
}

/**
 * If the shape if 'rectangle', the direction right-left selects an element event if it's partially in the selection surface
 * With the shape 'lasso', the partial mode is always enabled
 * @param param0 
 * @returns 
 */
const Selector = ({shape = "rectangle", style}: {shape?: "rectangle"|"lasso", style?: Partial<SelectorStyle>}) => {
	const {setNodes} = useReactFlow()
	const { screenToFlowPosition } = useCustomViewportHelper()
	const canvas = React.useRef<HTMLCanvasElement>(null)
	const ctx = React.useRef<CanvasRenderingContext2D|undefined|null>(null)
	const {width, height, nodeLookup} = useStore((state) => ({
		width: state.width,
		height: state.height,
		nodeLookup: state.nodeLookup
	}))
	const nodesPoints = React.useRef<NodesPointsObject>({})
	const rectanglePoints = React.useRef<{p1: XYPosition, p2: XYPosition}>({p1: {x: 0, y: 0}, p2: {x: 0, y: 0}})
	const lassoPoints = React.useRef<Array<[number, number]>>([])
	const path = React.useRef<Path2D>(null)
	const selectorStyle: SelectorStyle = {
		fill: style?.fill ?? "rgba(0, 89, 220, 0.08)", stroke: style?.stroke ?? "rgba(0, 89, 220, 0.8)",
		rectangle: {
			rightLeft: {fill: "rgba(0, 220, 89, 0.08)", stroke: "rgba(0, 220, 89, 0.8)", ...style?.rectangle?.rightLeft}
		}
	}

	function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>){
		(e.target as HTMLCanvasElement).setPointerCapture(e.pointerId)
		const {x, y} = screenToFlowPosition({x: e.pageX, y: e.pageY})
		switch(shape){
			case "rectangle": rectanglePoints.current.p1 = {x, y}; break;
			case "lasso": lassoPoints.current = [[x, y]]; break;
		}
		nodesPoints.current = {}
		for(const node of nodeLookup.values()){
			const {x, y} = node.internals.positionAbsolute
			const {width = 0, height = 0} = node.measured
			const points = [
				[x, y], [x + width, y], [x + width, y + height], [x, y + height],
				[x + width/2, y], [x, y + height/2], [x + width, y + height/2], [x + width/2, y + height],
				[x + width/4, y], [x, y + height/4], [x + width, y + height/4], [x + width/4, y + height],
				[x + 3*width/4, y], [x, y + 3*height/4], [x + width, y + 3*height/4], [x + 3*width/4, y + height],
			] satisfies NodePoints
			nodesPoints.current[node.id] = points;
		}

		ctx.current = canvas.current?.getContext('2d')
		if(!ctx.current) return;
		ctx.current.lineWidth = 1
		ctx.current.fillStyle = selectorStyle.fill
		ctx.current.strokeStyle = selectorStyle.stroke
	}

	function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>){
		if(e.buttons !== 1) return;
		const {x, y} = screenToFlowPosition({x: e.pageX, y: e.pageY})
		switch(shape){
			case "rectangle": {
				rectanglePoints.current.p2 = {x, y}
				const {p1, p2} = rectanglePoints.current
				//Change the colors if the direction is right-left
				if(ctx.current){
					if(p2.x > p1.x){
						ctx.current.fillStyle = selectorStyle.fill
						ctx.current.strokeStyle = selectorStyle.stroke
					}else{
						ctx.current.fillStyle = selectorStyle.rectangle.rightLeft.fill
						ctx.current.strokeStyle = selectorStyle.rectangle.rightLeft.stroke
					}
				}
				path.current = new Path2D() 
				path.current.moveTo(p1.x, p1.y)
				path.current.lineTo(p2.x, p1.y)
				path.current.lineTo(p2.x, p2.y)
				path.current.lineTo(p1.x, p2.y)
				path.current.closePath()
				break;
			}
			case "lasso": {
				const nextPoints = [...lassoPoints.current, [x, y]] satisfies [number, number][];
				lassoPoints.current = nextPoints;
				path.current = new Path2D(getSvgPathFromStroke(nextPoints));
				break;
			}
		}
		if(!ctx.current || !path.current) return
		//Draw the selection path
		ctx.current.clearRect(0, 0, width, height)
		ctx.current.fill(path.current)
		ctx.current.stroke(path.current);
	}

	function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>){
		(e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId)
		if(ctx.current){
			if(path.current){
				const nodesToSelect = new Set<string>()
				const partial = (shape == "rectangle" && rectanglePoints.current.p2.x < rectanglePoints.current.p1.x) || shape == "lasso"
				for(const [nodeId, points] of Object.entries(nodesPoints.current)){
					if(partial){
						for(const point of points){
							if(ctx.current.isPointInPath(path.current, point[0], point[1])){
								nodesToSelect.add(nodeId)
								break
							}
						}
					}else{
						let allPointsInPath = true
						for(const point of points){
							if(!ctx.current.isPointInPath(path.current, point[0], point[1])){
								allPointsInPath = false
								break
							}
						}
						if(allPointsInPath) nodesToSelect.add(nodeId)
					}
				}
				setNodes(nds => nds.map(nd => ({...nd, selected: nodesToSelect.has(nd.id)})))
			}
			ctx.current.clearRect(0, 0, width, height)
		}
		lassoPoints.current = []
	}

	return <canvas
		ref={canvas}
		width={width}
		height={height}
		onPointerDown={handlePointerDown}
		onPointerMove={handlePointerMove}
		onPointerUp={handlePointerUp}
		style={{
			position: "absolute",
			top: 0, left: 0,
			zIndex: 4,
			transformOrigin: "top left",
			touchAction: "none",
		}}
	/>
}

export default Selector