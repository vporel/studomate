export default class ElementValidationError extends Error {
	elementId: string;
	errors: string[];

	constructor(elementId: string, errors: string[]) {
		super(`Validation error for element ${elementId}: ${errors.join(", ")}`);
		this.elementId = elementId;
		this.errors = errors;
	}
}
