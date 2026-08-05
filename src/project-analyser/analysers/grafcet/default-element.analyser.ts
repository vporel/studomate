import Element, { ElementType } from "@/schemas/grafcet/element.schema";
import Variable from "@/schemas/variable/variable.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyser from "./element.analyser";

/**
 * Default analyser that performs no validation and returns an empty list of issues.
 * Used for element types that don't require specific analysis logic.
 */
export default class DefaultElementAnalyser extends ElementAnalyser<Element<any>> {
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
		_variables: Variable[],
	): ProjectAnalyserIssue[] {
		return [];
	}
}
