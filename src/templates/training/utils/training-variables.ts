import {
	InputBehavior,
	PUSH_BUTTON_NO_BEHAVIOR,
} from "@/schemas/variable/input-behavior";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import Variable, { VariableType } from "@/schemas/variable/variable.schema";
import { createRandomId } from "@/ids";

export const PUSH_BUTTON_NC_BEHAVIOR: InputBehavior = {
	kind: "push-button-nc",
	params: null,
};

export const TOGGLE_SWITCH_BEHAVIOR: InputBehavior = {
	kind: "toggle-switch-no",
	params: null,
};

export const TOGGLE_SWITCH_NC_BEHAVIOR: InputBehavior = {
	kind: "toggle-switch-nc",
	params: null,
};

/** Boolean input with the behavior of its physical device (`null`: free, e.g. a sensor). */
export const input = (
	mnemonic: string,
	behavior: InputBehavior | null = null,
): Variable =>
	VariableBuilder.buildLogicInput(createRandomId(), mnemonic, behavior);

export const pushButton = (mnemonic: string): Variable =>
	input(mnemonic, PUSH_BUTTON_NO_BEHAVIOR);

/** Stop or safety device wired normally closed. */
export const stopButton = (mnemonic: string): Variable =>
	input(mnemonic, PUSH_BUTTON_NC_BEHAVIOR);

export const toggleSwitch = (mnemonic: string): Variable =>
	input(mnemonic, TOGGLE_SWITCH_BEHAVIOR);

/** Maintained sensor wired normally closed (e.g. a temperature or level switch). */
export const toggleSwitchNc = (mnemonic: string): Variable =>
	input(mnemonic, TOGGLE_SWITCH_NC_BEHAVIOR);

export const output = (mnemonic: string): Variable =>
	VariableBuilder.buildLogicOutput(createRandomId(), mnemonic);

export const memory = (
	mnemonic: string,
	type: VariableType = "BOOL",
): Variable =>
	new VariableBuilder()
		.id(createRandomId())
		.mnemonic(mnemonic)
		.zone("memory")
		.type(type)
		.build();

/** `INT` analog input driven by a slider over `[min, max]`. */
export const analogInput = (
	mnemonic: string,
	min: number,
	max: number,
): Variable =>
	new VariableBuilder()
		.id(createRandomId())
		.mnemonic(mnemonic)
		.zone("analog-input")
		.type("INT")
		.behavior({ kind: "slider", params: { min, max } })
		.build();
