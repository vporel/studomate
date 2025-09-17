'use client'
import React, { useState, useCallback } from 'react';
import { useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';

const JunctionNodeVerticalBar = ({color, left, nodeWidth, height, pivot, onMove}: {color: string, left: number, nodeWidth: number, height: string, pivot?: boolean, onMove: (delta: number) => void}) =>{
	const [cloneData, setCloneData] = useState<{left: number, visible: boolean}>({left, visible: false})
	const {screenToFlowPosition} = useReactFlow()
	const [moveStartX, setMoveStartX] = useState<number>(0)
	const [moveEndX, setMoveEndX] = useState<number>(0)

	const handleBranchPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
		setMoveStartX(screenToFlowPosition({x: e.pageX, y: e.pageY}).x)
	}, [])

	const handleBranchPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if(e.buttons !== 1) return;
		const {x, y} = screenToFlowPosition({x: e.pageX, y: e.pageY})
		const delta = x - moveStartX
		const newLeft = left + delta
		if(newLeft > 0 && newLeft < nodeWidth){
			setMoveEndX(x)
			setCloneData({left+delta, visible: true})
		}
	}, [moveStartX, nodeWidth])
	
	const handleBranchPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		(e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
		onMove(moveEndX - moveStartX)
		setCloneData(d => {...d, visible: false})
	}, [moveStartX, moveEndX, onMove])

	return <>
		<Box
			component="div"
			sx={{
				position: pivot ? "initial" : "absolute",
				width: "1px", background: borderColor,
				position: "absolute", height: height,
				left: pivot ? "auto" : left+"px",
				marginLeft: pivot ? left+"px" : "auto"
			}}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
		/>
		{/* A clone to visualiza the movements */}
		{cloneData.visible && <Box
			component="div"
			sx={{
				background: "red",
				position: pivot ? "initial" : "absolute",
				width: "1px",
				position: "absolute", height: height,
				left: pivot ? "auto" : cloneData.left+"px",
				marginLeft: pivot ? cloneData.left+"px" : "auto",
			}}
		/>}
	</>
}

export default AndJunctionEndNode