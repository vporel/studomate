import Grafcet from "../Grafcet.class";
import { BaseData } from "../GrafcetElement.class";
import { ElementValidateDataOptions } from "./types";

export default abstract class ElementDataValidator<D extends BaseData> {
	abstract validateData(
		element: string,
		data: Partial<D>,
		grafcet: Grafcet,
		options: ElementValidateDataOptions,
	): string[];
}
