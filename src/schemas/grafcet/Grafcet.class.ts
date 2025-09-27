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
import Transition from "./transition.class";

export type GrafcetFormat = {
	type: "A4" | "A3";
	orientation: "portrait" | "landscape";
};

export type XYPosition = { x: number; y: number };
export type Dimensions = { width: number; height: number };

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
	id: string = "";
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

	constructor(id: string, format: GrafcetFormat) {
		this.id = id;
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

	getElementGroup(type: GrafcetElementType) {
		switch (type) {
			case "step":
				return this.steps;
			case "action":
				return this.actions;
			case "transition":
				return this.transitions;
			case "step-referral-source":
				return this.stepsReferralsSources;
			case "step-referral-target":
				return this.stepsReferralsTargets;
			case "junction-and-start":
				return this.junctionsAndStarts;
			case "junction-and-end":
				return this.junctionsAndEnds;
			case "junction-or-start":
				return this.junctionsOrStarts;
			case "junction-or-end":
				return this.junctionsOrEnds;
			case "comment":
				return this.comments;
		}
	}

	getElement(type: GrafcetElementType, id: string): GrafcetElement<any> | undefined {
		const group = this.getElementGroup(type);
		return group.find((e) => e.id === id);
	}

	addElements(elements: { type: GrafcetElementType; id: string; data: any; position: XYPosition }[]): void {
		elements.forEach(({ type, id, data, position }) => {
			const group = this.getElementGroup(type);
			const element = new elementsSchemasClasses[type](id, data, position);
			if (!group.find((e) => e.id === element.id)) {
				group.push(element);
			}
		});
	}

	updateElements(
		elements: { type: GrafcetElementType; id: string; data: any; position: XYPosition }[]
	): void {
		elements.forEach(({ type, id, data, position }) => {
			const group = this.getElementGroup(type);
			const element = group.find((e) => e.id === id);
			if (element) {
				element.data = data;
				element.position = position;
			}
		});
	}

	removeElements(elements: { type: GrafcetElementType; id: string }[]): void {
		elements.forEach(({ type, id }) => {
			const group = this.getElementGroup(type);
			const index = group.findIndex((e) => e.id === id);
			if (index !== -1) {
				group.splice(index, 1);
			}
		});
	}

	getConnection(fromId: string, toId: string): GrafcetConnection | undefined {
		return this.connections.find((c) => c.from.id === fromId && c.to.id === toId);
	}

	addConnections(connections: GrafcetConnection[]): void {
		// Check if connection elements exist, the from and the to
		connections.forEach((connection) => {
			const fromExists = !!this.getElement(connection.from.type, connection.from.id);
			const toExists = !!this.getElement(connection.to.type, connection.to.id);
			if (!fromExists) {
				throw new Error(
					`Connection 'from' element missing: type=${connection.from.type}, id=${connection.from.id}`
				);
			}
			if (!toExists) {
				throw new Error(
					`Connection 'to' element missing: type=${connection.to.type}, id=${connection.to.id}`
				);
			}
			if (
				fromExists &&
				toExists &&
				!this.connections.find(
					(c) => c.from.id === connection.from.id && c.to.id === connection.to.id
				)
			) {
				this.connections.push(connection);
			}
		});
	}

	updateConnections(connections: GrafcetConnection[]): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.from.id === connection.from.id && c.to.id === connection.to.id
			);
			if (index !== -1) {
				this.connections[index] = connection;
			}
		});
	}

	removeConnections(
		connections: {
			from: { type: GrafcetElementType; id: string };
			to: { type: GrafcetElementType; id: string };
		}[]
	): void {
		connections.forEach((connection) => {
			const index = this.connections.findIndex(
				(c) => c.from.id === connection.from.id && c.to.id === connection.to.id
			);
			if (index !== -1) {
				this.connections.splice(index, 1);
			}
		});
	}
}
