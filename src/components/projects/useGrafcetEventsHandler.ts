'use client'

import { useEffect } from "react"
import { GrafcetNodeAddActionData, useProjectContext } from "./ProjectContext"
import Project from "@/schemas/project.schema"
import Step from "@/schemas/step.schema"
import { STEP_NODE_DEFAULT_DIMENSIONS } from "../grafcet/nodes/StepNode"

export default function useGrafcetEventsHandler(setProject: (val: (p: Project) => Project) => void){
	const {grafcetEvents} = useProjectContext()

	//Nodes
	useEffect(() => {
		const nodeAddHandler = (action: GrafcetNodeAddActionData) => {
			setProject(p => {
				const newProject = {...p}
				switch(action.type){
					case "step": {
						newProject.grafcets[action.grafcetId].steps.push(new Step(action.id, action.data.number, action.position, STEP_NODE_DEFAULT_DIMENSIONS));
						break;
					}
				}
				return newProject
			})
		}
		grafcetEvents.on("node-add", nodeAddHandler)
		return () => {
			grafcetEvents.off("node-add", nodeAddHandler)
		}
	}, [grafcetEvents, setProject])
}