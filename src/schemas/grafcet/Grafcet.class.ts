import Action from "./Action.class";
import Comment from "./Comment.class";
import GrafcetConnection from "./GrafcetConnection.class";
import GrafcetElement, { GrafcetElementType } from "./GrafcetElement.class";
import JunctionAndEnd from "./JunctionAndEnd.class";
import JunctionAndStart from "./JunctionAndStart.class";
import JunctionOrEnd from "./JunctionOrEnd.class";
import JunctionOrStart from "./JunctionOrStart.class";
import Step from "./Step.class";
import StepReferralSource from "./StepReferralSource.class";
import StepReferralTarget from "./StepReferralTarget.class";
import Transition from "./Transition.class";
import { XYPosition } from "./shared-types";

export type GrafcetFormat = {
	type: "A4" | "A3";
	orientation: "portrait" | "landscape";
};

export const DEFAULT_GRAFCET_NAME = "Sans titre";

export const DEFAULT_GRAFCET_FORMAT: GrafcetFormat = {
	type: "A4",
	orientation: "portrait",
};

export const elementsSchemasClasses: Record<GrafcetElementType, any> = {
	step: Step,
	action: Action,
	transition: Transition,
	"step-referral-source": StepReferralSource,
	"step-referral-target": StepReferralTarget,
	"junction-or-start": JunctionOrStart,
	"junction-or-end": JunctionOrEnd,
	"junction-and-start": JunctionAndStart,
	"junction-and-end": JunctionAndEnd,
	comment: Comment,
};

export default class Grafcet {
	id: string;
	name: string;
	format: GrafcetFormat = { type: "A4", orientation: "portrait" };
	steps: Step[] = [];
	actions: Action[] = [];
	transitions: Transition[] = [];
	stepsReferralsSources: StepReferralSource[] = [];
	stepsReferralsTargets: StepReferralTarget[] = [];
	junctionsAndStarts: JunctionAndStart[] = [];
	junctionsAndEnds: JunctionAndEnd[] = [];
	junctionsOrStarts: JunctionOrStart[] = [];
	junctionsOrEnds: JunctionOrEnd[] = [];
	comments: Comment[] = [];
	connections: GrafcetConnection[] = [];

	constructor(id: string, name: string, format: GrafcetFormat) {
		this.id = id;
		this.name = name;
		this.format = format;
	}

	/**
	 *
	 * @returns The keys are the steps' ids, the values are the ids of the steps and transition(s) necessary to activate the designated step
	 */
	getStepsActivationConditions(): Record<string, string[]> {
		return {};
	}

	validate(): string[] | null {
		return null;
	}

	/**
	 * Get the connections that have the provided element id as source or target, regardless of the handle id
	 * @param elementId
	 * @returns
	 */
	getConnectionsByElementId(elementId: string): GrafcetConnection[] {
		return this.connections.filter((c) => c.source.id === elementId || c.target.id === elementId);
	}

	getConnectionsByElementIdAndHandleId(elementId: string, handleId: string): GrafcetConnection[] {
		return this.connections.filter(
			(c) =>
				(c.source.id === elementId && c.source.handleId === handleId) ||
				(c.target.id === elementId && c.target.handleId === handleId),
		);
	}

	/**
	 * Get a map of all the elements of the grafcet, with their type as key, and the elements list as value
	 * @returns
	 */
	getTypeToElementsMap(): Record<GrafcetElementType, GrafcetElement<any>[]> {
		return {
			step: this.steps,
			action: this.actions,
			transition: this.transitions,
			"step-referral-source": this.stepsReferralsSources,
			"step-referral-target": this.stepsReferralsTargets,
			"junction-and-start": this.junctionsAndStarts,
			"junction-and-end": this.junctionsAndEnds,
			"junction-or-start": this.junctionsOrStarts,
			"junction-or-end": this.junctionsOrEnds,
			comment: this.comments,
		};
	}

	/**
	 * Get all the elements of the grafcet in a single list
	 * @returns
	 */
	getAllElements(): GrafcetElement<any>[] {
		const typeToElementsMap = this.getTypeToElementsMap();
		let allElements: GrafcetElement<any>[] = [];
		(Object.keys(typeToElementsMap) as GrafcetElementType[]).forEach((type) => {
			const elements = typeToElementsMap[type];
			allElements = allElements.concat(elements);
		});
		return allElements;
	}

	getElementsByType(type: GrafcetElementType): GrafcetElement<any>[] {
		const typeToElementsMap = this.getTypeToElementsMap();
		return typeToElementsMap[type];
	}

	getElementByIdAndType(id: string, type: GrafcetElementType): GrafcetElement<any> | undefined {
		const group = this.getElementsByType(type);
		return group.find((e) => e.id === id);
	}

	getElementById(id: string): GrafcetElement<any> | undefined {
		const allElements = this.getAllElements();
		return allElements.find((e) => e.id === id);
	}

	addElements(elements: { type: GrafcetElementType; id: string; data: any; position: XYPosition }[]): void {
		elements.forEach(({ type, id, data, position }) => {
			const group = this.getElementsByType(type);
			const element = new elementsSchemasClasses[type](id, structuredClone(data), position);
			if (!group.find((e) => e.id === element.id)) {
				group.push(element);
			}
		});
	}

	updateElements(
		elements: { type: GrafcetElementType; id: string; data?: any; position?: XYPosition }[],
	): void {
		elements.forEach(({ type, id, data, position }) => {
			const group = this.getElementsByType(type);
			const element = group.find((e) => e.id === id);
			if (element) {
				if (data) element.updateData(data);
				if (position) element.position = position;
			}
		});
	}

	removeElements(elements: { type: GrafcetElementType; id: string }[]): void {
		elements.forEach(({ type, id }) => {
			const group = this.getElementsByType(type);
			const index = group.findIndex((e) => e.id === id);
			if (index !== -1) {
				group.splice(index, 1);
			}
			// Remove related connections
			const relatedConnections = this.connections.filter(
				(c) => c.source.id === id || c.target.id === id,
			);
			this.removeConnections(
				relatedConnections.map((c) => ({ sourceId: c.source.id, targetId: c.target.id })),
			);
		});
	}

	getConnection(sourceId: string, targetId: string): GrafcetConnection | undefined {
		return this.connections.find((c) => c.source.id === sourceId && c.target.id === targetId);
	}

	addConnections(connections: GrafcetConnection[]): void {
		// Check if connection elements exist, the source and the target
		connections.forEach((connection) => {
			const sourceExists = !!this.getElementByIdAndType(connection.source.id, connection.source.type);
			const targetExists = !!this.getElementByIdAndType(connection.target.id, connection.target.type);
			if (!sourceExists) {
				throw new Error(
					`Connection 'source' element missing: type=${connection.source.type}, id=${connection.source.id}`,
				);
			}
			if (!targetExists) {
				throw new Error(
					`Connection 'target' element missing: type=${connection.target.type}, id=${connection.target.id}`,
				);
			}
			if (
				sourceExists &&
				targetExists &&
				!this.connections.find(
					(c) => c.source.id === connection.source.id && c.target.id === connection.target.id,
				)
			) {
				this.connections.push(connection);
			}
		});
	}

	/**
	 * Replace the connections with the same source and target ids with the provided ones, if they exist.
	 * If a connection doesn't exist, it will be ignored
	 * @param connections
	 */
	updateConnections(connections: GrafcetConnection[]): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.source.id === connection.source.id && c.target.id === connection.target.id,
			);
			if (index !== -1) {
				this.connections[index] = connection;
			}
		});
	}

	removeConnections(
		connections: {
			sourceId: string;
			targetId: string;
		}[],
	): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.source.id === connection.sourceId && c.target.id === connection.targetId,
			);
			if (index !== -1) {
				this.connections.splice(index, 1);
			}
		});
	}

	copy(): Grafcet {
		const newGrafcet = Object.assign(new Grafcet(this.id, this.name, this.format), this);
		newGrafcet.steps = this.steps.map((s) => s.copy());
		newGrafcet.actions = this.actions.map((a) => a.copy());
		newGrafcet.transitions = this.transitions.map((t) => t.copy());
		newGrafcet.stepsReferralsSources = this.stepsReferralsSources.map((s) => s.copy());
		newGrafcet.stepsReferralsTargets = this.stepsReferralsTargets.map((s) => s.copy());
		newGrafcet.junctionsAndStarts = this.junctionsAndStarts.map((j) => j.copy());
		newGrafcet.junctionsAndEnds = this.junctionsAndEnds.map((j) => j.copy());
		newGrafcet.junctionsOrStarts = this.junctionsOrStarts.map((j) => j.copy());
		newGrafcet.junctionsOrEnds = this.junctionsOrEnds.map((j) => j.copy());
		newGrafcet.comments = this.comments.map((c) => c.copy());
		newGrafcet.connections = this.connections.map((c) => c.copy());
		return newGrafcet;
	}

	static createFromJSON(json: string): Grafcet {
		const jsonParsed = JSON.parse(json);
		const grafcet = Object.assign(new Grafcet("", "", DEFAULT_GRAFCET_FORMAT), jsonParsed);
		grafcet.steps = (jsonParsed.steps ?? []).map((s: any) => Step.createFromJSON(JSON.stringify(s)));
		grafcet.actions = (jsonParsed.actions ?? []).map((a: any) =>
			Action.createFromJSON(JSON.stringify(a)),
		);
		grafcet.transitions = (jsonParsed.transitions ?? []).map((t: any) =>
			Transition.createFromJSON(JSON.stringify(t)),
		);
		grafcet.stepsReferralsSources = (jsonParsed.stepsReferralsSources ?? []).map((s: any) =>
			StepReferralSource.createFromJSON(JSON.stringify(s)),
		);
		grafcet.stepsReferralsTargets = (jsonParsed.stepsReferralsTargets ?? []).map((s: any) =>
			StepReferralTarget.createFromJSON(JSON.stringify(s)),
		);
		grafcet.junctionsAndStarts = (jsonParsed.junctionsAndStarts ?? []).map((j: any) =>
			JunctionAndStart.createFromJSON(JSON.stringify(j)),
		);
		grafcet.junctionsAndEnds = (jsonParsed.junctionsAndEnds ?? []).map((j: any) =>
			JunctionAndEnd.createFromJSON(JSON.stringify(j)),
		);
		grafcet.junctionsOrStarts = (jsonParsed.junctionsOrStarts ?? []).map((j: any) =>
			JunctionOrStart.createFromJSON(JSON.stringify(j)),
		);
		grafcet.junctionsOrEnds = (jsonParsed.junctionsOrEnds ?? []).map((j: any) =>
			JunctionOrEnd.createFromJSON(JSON.stringify(j)),
		);
		grafcet.comments = (jsonParsed.comments ?? []).map((c: any) =>
			Comment.createFromJSON(JSON.stringify(c)),
		);
		grafcet.connections = (jsonParsed.connections ?? []).map((c: any) =>
			GrafcetConnection.createFromJSON(JSON.stringify(c)),
		);
		return grafcet;
	}
}
