import { Dialect } from "@/expression-language/dialect.enum";
import type { ArduinoUnoR3Target } from "@/schemas/hardware/hardware-target.schema";
import Variable from "@/schemas/variable/variable.schema";
import { VariableFactory } from "@tests/utils/variable-factory";
import uno from "../uno-r3.descriptor";
import buildRemoteIoPlan, { arduinoPinName } from "./remote-io-plan";

const at = (variable: Variable, address: string): Variable =>
	variable.update({ address }, Dialect.FR);
const TARGET: ArduinoUnoR3Target = { modelId: "arduino-uno-r3" };
const build = (variables: Variable[], target = TARGET) =>
	buildRemoteIoPlan(target, variables, uno);

describe("arduinoPinName", () => {
	it("maps addresses to Arduino pin names", () => {
		expect(arduinoPinName("%PD13")).toBe("13");
		expect(arduinoPinName("%PD2")).toBe("2");
		expect(arduinoPinName("%PA0")).toBe("A0");
		expect(arduinoPinName("%I0.0")).toBeNull();
	});
});

describe("buildRemoteIoPlan", () => {
	it("maps a digital input with the default pull-up and inversion", () => {
		const plan = build([
			at(VariableFactory.createLogicInput("BP", "v1"), "%PD2"),
		]);
		expect(plan.pins).toEqual([{ pin: "2", mode: "IP" }]);
		expect(plan.inputs).toEqual([
			{ variableId: "v1", pin: "2", kind: "digital", inverted: true },
		]);
		expect(plan.outputs).toEqual([]);
	});

	it("honours the configured mode and inversion", () => {
		const plan = build(
			[at(VariableFactory.createLogicInput("BP", "v1"), "%PD2")],
			{
				modelId: "arduino-uno-r3",
				pins: { "%PD2": { mode: "INPUT", inverted: false } },
			},
		);
		expect(plan.pins).toEqual([{ pin: "2", mode: "I" }]);
		expect(plan.inputs[0].inverted).toBe(false);
	});

	it("maps digital outputs, PWM outputs and analog inputs", () => {
		const plan = build([
			at(VariableFactory.createLogicOutput("LED", "v1"), "%PD13"),
			at(VariableFactory.createAnalogOutput("PWM", "v2"), "%PD9"),
			at(VariableFactory.createAnalogInput("POT", "v3"), "%PA0"),
		]);
		expect(plan.pins).toEqual([
			{ pin: "13", mode: "O" },
			{ pin: "9", mode: "P" },
			{ pin: "A0", mode: "A" },
		]);
		expect(plan.outputs).toEqual([
			{
				variableId: "v1",
				pin: "13",
				kind: "digital",
				range: { min: 0, max: 1 },
			},
			{
				variableId: "v2",
				pin: "9",
				kind: "analog",
				range: { min: 0, max: 255 },
			},
		]);
		expect(plan.inputs).toEqual([
			{ variableId: "v3", pin: "A0", kind: "analog", inverted: false },
		]);
	});

	it("leaves out variables the board cannot serve", () => {
		const plan = build([
			VariableFactory.createLogicInput("NoAddress", "a"),
			at(VariableFactory.createMemoryBool("Mem", "b"), "%PD2"),
			at(VariableFactory.createLogicInput("Reserved", "c"), "%PD0"),
			at(VariableFactory.createLogicInput("Unknown", "d"), "%PD40"),
			at(VariableFactory.createAnalogOutput("NoPwm", "e"), "%PD4"),
			at(VariableFactory.createAnalogInput("NotAnalog", "f"), "%PD5"),
		]);
		expect(plan).toEqual({ pins: [], inputs: [], outputs: [] });
	});

	it("lets the first variable of a shared pin set its mode", () => {
		const plan = build([
			at(VariableFactory.createLogicInput("A", "v1"), "%PD2"),
			at(VariableFactory.createLogicInput("B", "v2"), "%PD2"),
		]);
		expect(plan.pins).toEqual([{ pin: "2", mode: "IP" }]);
		expect(plan.inputs.map((input) => input.variableId)).toEqual(["v1", "v2"]);
	});
});

describe("buildRemoteIoPlan: constantes", () => {
	it("n'attribue jamais de broche à une constante", () => {
		const constant = VariableFactory.createLogicInput("BP", "v1");
		const k = new Variable({
			id: "k",
			mnemonic: "K",
			zone: "constant",
			type: "INT",
			value: "4",
			dialect: Dialect.FR,
		});
		k.address = "%PD2";

		const plan = build([k, constant]);

		expect(plan).toEqual({ pins: [], inputs: [], outputs: [] });
	});
});
