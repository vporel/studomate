import ElementValidationError from "./errors/ElementValidationError";
import GrafcetElement, { BaseData } from "./GrafcetElement.class";
import { Dimensions, XYPosition } from "./shared-types";

export type StepData = BaseData & {
	number: number | "";
	initial?: boolean;
};

export default class Step extends GrafcetElement<StepData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 40,
		height: 40,
	};

	static generateDefaultData(extraData?: { initial?: boolean }): StepData {
		return {
			number: "",
			initial: extraData?.initial ?? false,
			width: Step.DEFAULT_DIMENSIONS.width,
			height: Step.DEFAULT_DIMENSIONS.height,
		};
	}

	constructor(id: string, data: StepData, position: XYPosition) {
		super(id, "step", data, position);
	}

	validateData(): void {
		const erros: string[] = [];
		if (this.data.number === "") {
			erros.push("Le numéro de l'étape ne peut pas être vide.");
		} else if (isNaN(parseInt(this.data.number + "")) || parseInt(this.data.number + "") < 0) {
			erros.push("Le numéro de l'étape doit être un nombre entier positif.");
		}
		if (erros.length > 0) {
			throw new ElementValidationError(this.id, erros);
		}
	}

	copy(): Step {
		return new Step(this.id, { ...this.data }, { ...this.position });
	}

	static createFromJSON(json: string): Step {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Step("", { ...Step.generateDefaultData() }, { x: 0, y: 0 }), jsonParsed);
	}
}
