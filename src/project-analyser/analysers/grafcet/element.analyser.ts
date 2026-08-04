import { Dialect } from "@/expression-language/dialect.enum";
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
	/**
	 * Dialecte dans lequel les expressions de l'élément sont écrites.
	 * @default Dialect.FR
	 */
	dialect?: Dialect;
};

export default abstract class ElementAnalyser<E extends Element<BaseData>> {
	/**
	 * Rules that apply to the element's own data, independently of the grafcet.
	 */
	abstract analyseIsolated(element: E, options?: ElementAnalyseIsolatedOptions): ProjectAnalyserIssue[];

	/**
	 * Rules that require knowledge of the grafcet and the project.
	 */
	/**
	 * @param dialect Dialecte des expressions. Les implémentations qui n'en ont pas besoin
	 * peuvent l'omettre de leur signature.
	 */
	abstract analyseInContext(
		element: E,
		grafcet: Grafcet,
		variables: Variable[],
		dialect: Dialect,
	): ProjectAnalyserIssue[];
}
