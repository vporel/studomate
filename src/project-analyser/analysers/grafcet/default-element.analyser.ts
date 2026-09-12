import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser from "./element.analyser";

/**
 * Default analyser that performs no validation and returns an empty list of issues.
 * Used for element types that don't require specific analysis logic.
 */
export default class DefaultElementAnalyser extends GrafcetElementAnalyser<
	Element<any>
> {
	elementType: ElementType;

	constructor(elementType: ElementType) {
		super();
		this.elementType = elementType;
	}

	analyseIsolated(_element: Element<any>): ProjectAnalyserIssue[] {
		return [];
	}

	analyseInContext(
		_element: Element<any>,
		_grafcet: Grafcet,
		_environment: Environment,
	): ProjectAnalyserIssue[] {
		return [];
	}
}
