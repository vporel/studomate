'use client'

import { useEffect } from "react"
import { ContextMenuPaneAction, useGrafcetContext } from "./GrafcetContext"
import { useReactFlow } from "@xyflow/react"

export default function useFlowContextMenuActionsHandlers(){
	const {contextMenuEvents} = useGrafcetContext()
	const {setNodes, setEdges} = useReactFlow()

	//Pane actions
	useEffect(() => {
		const handler = (action: ContextMenuPaneAction) => {
			switch(action.type){
				case "select-all": {
					setNodes(nds => nds.map(n => ({...n, selected: true})))
					setEdges(eds => eds.map(ed => ({...ed, selected: true})))
					break;
				}
				case "select-all-edges": {
					setEdges(eds => eds.map(ed => ({...ed, selected: true})))
					break;
				}
			}
		}
		contextMenuEvents.on("pane-action", handler)

		return () => {
			contextMenuEvents.off("pane-action", handler)
		}
	}, [contextMenuEvents])
}