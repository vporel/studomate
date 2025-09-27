"use client";

import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet from "@/schemas/grafcet/Grafcet.class";
import GrafcetElement from "@/schemas/grafcet/GrafcetElement.class";
import Project from "@/schemas/project/Project.class";
import { Emitter } from "mitt";
import { useEffect } from "react";
import { GrafcetEvents } from "./ProjectContext";

export default function useGrafcetEventsHandler(
	grafcetEvents: Emitter<GrafcetEvents>,
	setProject: (val: (p: Project | null) => Project | null) => void,
	commandsStack: CommandsStack<Project>
) {
	//Grafcet
	useEffect(() => {
		const grafcetAddHandler = (grafcet: Grafcet) => {
			setProject((p) => {
				if (!p) {
					throw new Error("Project is null, cannot add grafcet.");
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
					throw new Error("Project is null, cannot add node.");
					return p;
				}
				if (!p.grafcets[eventData.grafcetId]) {
					throw new Error("Grafcet with id", eventData.grafcetId, "not found in project.");
					return p;
				}
				const newProject = { ...p };
				const element = new nodesSchemasClasses[eventData.type](
					eventData.id,
					eventData.data,
					eventData.position
				) as GrafcetElement;
				const group = newProject.grafcets[eventData.grafcetId].getElementGroup(eventData.type);
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
