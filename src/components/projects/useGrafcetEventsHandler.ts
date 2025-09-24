"use client";

import GrafcetElement from "@/schemas/grafcet/grafcet-element.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Project from "@/schemas/project/project.schema";
import { useEffect } from "react";
import { nodesSchemasClasses } from "../grafcet/grafcet-nodes-definitions";
import { GrafcetNodeAddActionData, useProjectContext } from "./ProjectContext";

export default function useGrafcetEventsHandler(
	setProject: (val: (p: Project | null) => Project | null) => void
) {
	const { grafcetEvents } = useProjectContext();

	//Grafcet
	useEffect(() => {
		const grafcetAddHandler = (grafcet: Grafcet) => {
			setProject((p) => {
				if (!p) {
					console.error("Project is null, cannot add grafcet.");
					return p;
				}
				const newProject = { ...p };
				newProject.grafcets[grafcet.id] = grafcet;
				return newProject;
			});
		};
		grafcetEvents.on("grafcet-add", grafcetAddHandler);
		return () => {
			grafcetEvents.off("grafcet-add", grafcetAddHandler);
		};
	}, [grafcetEvents, setProject]);

	//Nodes
	useEffect(() => {
		const nodeAddHandler = (eventData: GrafcetNodeAddActionData) => {
			setProject((p) => {
				if (!p) {
					console.error("Project is null, cannot add node.");
					return p;
				}
				if (!p.grafcets[eventData.grafcetId]) {
					console.error(
						"Grafcet with id",
						eventData.grafcetId,
						"not found in project."
					);
					return p;
				}
				const newProject = { ...p };
				const element = new nodesSchemasClasses[eventData.type](
					eventData.id,
					eventData.data,
					eventData.position
				) as GrafcetElement;
				const group = newProject.grafcets[
					eventData.grafcetId
				].getElementGroup(eventData.type);
				if (!group.find((e) => e.id === element.id)) {
					group.push(element as any);
				}
				return newProject;
			});
		};
		grafcetEvents.on("node-add", nodeAddHandler);
		return () => {
			grafcetEvents.off("node-add", nodeAddHandler);
		};
	}, [grafcetEvents, setProject]);
}
