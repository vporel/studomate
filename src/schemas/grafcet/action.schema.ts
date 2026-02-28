import Element, { BaseData, ElementType } from "./element.schema";
import { Dimensions, XYPosition } from "./shared-types";

export const ACTION_HANDLE_TARGET_STEP = "target:step";

export type ActionHandle = typeof ACTION_HANDLE_TARGET_STEP;

export const ACTION_HANDLE_TARGET_STEP_TYPES = ["step"] as const satisfies readonly ElementType[];

export const ACTION_HANDLES_TO_TYPES: Record<ActionHandle, readonly ElementType[]> = {
	[ACTION_HANDLE_TARGET_STEP]: ACTION_HANDLE_TARGET_STEP_TYPES,
};

export enum ActionType {
	TEXT = "text",
	BOOLEAN_VARIABLE = "boolean_variable", //Boolean variable. For this type, the expression should only contain the mnemonic of the variable, without any operator or value, since the execution mode will determine how the variable is manipulated
	NUMERIC_VARIABLE = "numeric_variable", //Numeric variable (int, real, ...)
	STRING_VARIABLE = "string_variable", //String variable
}

export const ACTION_TYPES_LABELS: Record<ActionType, string> = {
	[ActionType.TEXT]: "Texte",
	[ActionType.BOOLEAN_VARIABLE]: "Variable booléene",
	[ActionType.NUMERIC_VARIABLE]: "Variable numérique",
	[ActionType.STRING_VARIABLE]: "Variable chaîne de caractères",
};

export enum ActionExecutionMode {
	CONTINUOUS = "continuous", //The action is executed as long as the step is active
	RISING_EDGE = "rising_edge", //The action is executed only at the moment the step becomes active
	FALLING_EDGE = "falling_edge", //The action is executed only at the moment the step becomes inactive
	SET = "set", //Set a boolean variable to true
	RESET = "reset", //Set a boolean variable to false
}

export const ACTION_EXECUTION_MODE_LABELS: Record<ActionExecutionMode, string> = {
	[ActionExecutionMode.CONTINUOUS]: "Continue",
	[ActionExecutionMode.RISING_EDGE]: "Front montant",
	[ActionExecutionMode.FALLING_EDGE]: "Front descendant",
	[ActionExecutionMode.SET]: "Set",
	[ActionExecutionMode.RESET]: "Reset",
};

/**
 * Defines which execution modes are compatible with each action type. For example, SET and RESET modes are only compatible with BOOLEAN actions.
 */
export const ACTION_TYPES_TO_EXECUTION_MODES: Record<ActionType, ActionExecutionMode[]> = {
	[ActionType.TEXT]: [], //No execution mode is compatible with text actions since they are purely descriptive and don't manipulate variables
	[ActionType.BOOLEAN_VARIABLE]: [
		ActionExecutionMode.CONTINUOUS,
		ActionExecutionMode.RISING_EDGE,
		ActionExecutionMode.FALLING_EDGE,
		ActionExecutionMode.SET,
		ActionExecutionMode.RESET,
	],
	[ActionType.NUMERIC_VARIABLE]: [
		ActionExecutionMode.CONTINUOUS,
		ActionExecutionMode.RISING_EDGE,
		ActionExecutionMode.FALLING_EDGE,
	],
	[ActionType.STRING_VARIABLE]: [
		ActionExecutionMode.CONTINUOUS,
		ActionExecutionMode.RISING_EDGE,
		ActionExecutionMode.FALLING_EDGE,
	],
};

export type ActionAssignment = {
	variableId: string;
	value: any;
	stored: boolean;
};

export type ActionData = BaseData & {
	expression: string;
	type: ActionType;
	executionMode: ActionExecutionMode | null;
};

export default class Action extends Element<ActionData> {
	static DEFAULT_DIMENSIONS: Dimensions = {
		width: 100,
		height: 40,
	};

	static generateDefaultData(): ActionData {
		return {
			width: Action.DEFAULT_DIMENSIONS.width,
			height: Action.DEFAULT_DIMENSIONS.height,
			expression: "",
			type: ActionType.TEXT,
			executionMode: null,
		};
	}

	constructor(id: string, data: ActionData, position: XYPosition) {
		super(id, "action", data, position);
	}

	/**
	 * When the type is changed, we help the user by automatically changing
	 * the execution mode to the first compatible one with the new type if the current execution mode is not compatible with the new type.
	 * This way, we avoid leaving the action in an invalid state with incompatible type and execution mode.
	 */
	fixNewDataConsistency(newData: Partial<ActionData>): Partial<ActionData> {
		if (newData.type && !Action.isValidExecutionModeForType(newData.type, this.data.executionMode)) {
			const compatibleExecutionModes = ACTION_TYPES_TO_EXECUTION_MODES[newData.type];
			return {
				...newData,
				executionMode: compatibleExecutionModes.length > 0 ? compatibleExecutionModes[0] : null,
			};
		}
		return newData;
	}

	getExpressionLines(): string[] {
		if (!this.data.expression) return [];
		return this.data.expression
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	copy(): Action {
		return Action.createFromJSON(JSON.stringify(this));
	}

	static isValidExecutionModeForType(type: ActionType, executionMode: ActionExecutionMode | null): boolean {
		if (executionMode === null) return ACTION_TYPES_TO_EXECUTION_MODES[type].length === 0; //If execution mode is null, then the type must be one that doesn't require an execution mode
		return ACTION_TYPES_TO_EXECUTION_MODES[type].includes(executionMode);
	}

	static createFromJSON(json: string): Action {
		const jsonParsed = JSON.parse(json);
		return Object.assign(new Action("", { ...Action.generateDefaultData() }, { x: 0, y: 0 }), jsonParsed);
	}
}
