'use client'

import { useReactFlow } from "@xyflow/react";
import React, { useCallback } from "react";

export default function useFlowShortcutsHandler(): (e: React.KeyboardEvent) => void{
	const {setNodes} = useReactFlow()

	return useCallback((e: React.KeyboardEvent) => {
		//Ctrl+A : Select all
		if((e.ctrlKey || e.metaKey) && e.key == "a"){
			e.preventDefault()
			setNodes(nds => nds.map(n => ({...n, selected: true})))
		}
	}, [])
}