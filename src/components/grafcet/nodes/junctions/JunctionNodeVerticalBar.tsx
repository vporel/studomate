'use client'
import React, { useState, useCallback } from 'react';
import { useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';

const JunctionNodeVerticalBar = ({color, left, selected}: {color: string, left: number, selected?: boolean}) =>{

	return <>
		<Box
			component="div"
			sx={{
				position: "absolute",
				width: selected ? "4px" : "1px", background: selected ? "red" : color,
				height: "100%",
				left: (selected ? left-2 : left)+"px",
			}}
		/>
	</>
}

export default JunctionNodeVerticalBar