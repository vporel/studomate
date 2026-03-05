import Variable from "@/schemas/variable/variable.schema";
import Element, { BaseData } from "../../../schemas/grafcet/element.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";

export type ElementAnalyseIsolatedOptions = {
	/**
	 * When true, relaxes rules that would normally require the element to have non-empty content.
	 * @default false
	 */
	allowEmptyContent?: boolean;
};

export default abstract class ElementAnalyser<E extends Element<BaseData>> {
	/**
	 * Rules that apply to the element's own data, independently of the grafcet.
	 */
	abstract analyseIsolated(element: E, options?: ElementAnalyseIsolatedOptions): ProjectAnalyserIssue[];

	/**
	 * Rules that require knowledge of the grafcet and the project.
	 */
	abstract analyseInContext(element: E, grafcet: Grafcet, variables: Variable[]): ProjectAnalyserIssue[];
}
