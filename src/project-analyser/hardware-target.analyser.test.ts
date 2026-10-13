import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import TransitionBuilder from "@/schemas/grafcet/builders/transition.builder";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import type Project from "@/schemas/project/project.schema";
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import type {
	VariableType,
	VariableZone,
} from "@/schemas/variable/variable.schema";
import analyseHardwareTarget from "./hardware-target.analyser";
import ProjectAnalyser from "./project.analyser";

let nextId = 0;
function variable(
	mnemonic: string,
	zone: VariableZone,
	address?: string,
	type: VariableType = zone.startsWith("analog") ? "INT" : "BOOL",
) {
	const builder = new VariableBuilder()
		.id(`v${nextId++}`)
		.mnemonic(mnemonic)
		.zone(zone)
		.type(type);
	if (address !== undefined) builder.address(address);
	return builder.build();
}

function projectWith(
	variables: ReturnType<typeof variable>[],
	hardwareTarget: Project["hardwareTarget"] = { modelId: "arduino-uno-r3" },
): Project {
	const project = new ProjectBuilder().id("p1").name("P").author("A").build();
	project.variables = variables;
	project.hardwareTarget = hardwareTarget;
	return project;
}

const codes = (project: Project) =>
	analyseHardwareTarget(project).map((i) => i.code);

describe("analyseHardwareTarget", () => {
	describe("without a target", () => {
		it.each([undefined, null])(
			"checks nothing when hardwareTarget is %s, whatever the addresses",
			(target) => {
				const project = projectWith([
					variable("a", "logic-input", "%I0.0"),
					variable("b", "logic-input", "%PD0"),
					variable("c", "logic-output", "%PD0"),
					variable("d", "memory", "%PD2"),
				]);
				project.hardwareTarget = target;
				expect(analyseHardwareTarget(project)).toEqual([]);
			},
		);
	});

	describe("with an Arduino Uno R3", () => {
		it("accepts well-addressed I/O variables", () => {
			const project = projectWith([
				variable("btn", "logic-input", "%PD2"),
				variable("lamp", "logic-output", "%PD13"),
				variable("pot", "analog-input", "%PA0"),
				variable("dim", "analog-output", "%PD9"),
				variable("dio", "logic-input", "%PA3"),
			]);
			expect(analyseHardwareTarget(project)).toEqual([]);
		});

		it("ignores variables without an address", () => {
			const project = projectWith([
				variable("btn", "logic-input"),
				variable("lamp", "logic-output", ""),
			]);
			expect(analyseHardwareTarget(project)).toEqual([]);
		});

		it("does not constrain memory variables with a PLC address", () => {
			const project = projectWith([
				variable("m", "memory", "%MW10", "INT"),
				variable("n", "memory", "%I0.0"),
			]);
			expect(analyseHardwareTarget(project)).toEqual([]);
		});

		it("reports HARDWARE_MODEL_UNKNOWN for a model this version does not know", () => {
			const project = projectWith([variable("btn", "logic-input", "%PD2")], {
				modelId: "arduino-mega",
			} as unknown as Project["hardwareTarget"]);
			const issues = analyseHardwareTarget(project);
			expect(issues.map((i) => i.code)).toEqual(["HARDWARE_MODEL_UNKNOWN"]);
			expect(issues[0].params).toEqual({ modelId: "arduino-mega" });
		});

		describe("HARDWARE_PIN_UNKNOWN", () => {
			it.each(["%I0.0", "%PD14", "%PA6", "%PX2"])(
				"reports an I/O variable at %s",
				(address) => {
					const project = projectWith([
						variable("btn", "logic-input", address),
					]);
					const issues = analyseHardwareTarget(project);
					expect(issues.map((i) => i.code)).toEqual(["HARDWARE_PIN_UNKNOWN"]);
					expect(issues[0].params).toEqual({
						variableName: "btn",
						address,
						device: "Arduino Uno R3",
					});
				},
			);
		});

		describe("HARDWARE_PIN_RESERVED", () => {
			it.each(["%PD0", "%PD1"])("reports an I/O variable at %s", (address) => {
				const project = projectWith([variable("rx", "logic-input", address)]);
				expect(codes(project)).toEqual(["HARDWARE_PIN_RESERVED"]);
			});
		});

		describe("HARDWARE_PIN_CAPABILITY_MISMATCH", () => {
			it("reports an analog input on a digital pin", () => {
				const project = projectWith([variable("pot", "analog-input", "%PD5")]);
				const issues = analyseHardwareTarget(project);
				expect(issues.map((i) => i.code)).toEqual([
					"HARDWARE_PIN_CAPABILITY_MISMATCH",
				]);
				expect(issues[0].params).toMatchObject({
					variableName: "pot",
					address: "%PD5",
					zone: "analog-input",
				});
			});

			it("reports an analog output on a pin without PWM", () => {
				expect(
					codes(projectWith([variable("dim", "analog-output", "%PD4")])),
				).toEqual(["HARDWARE_PIN_CAPABILITY_MISMATCH"]);
			});

			it("reports an analog output on an analog pin", () => {
				expect(
					codes(projectWith([variable("dim", "analog-output", "%PA1")])),
				).toEqual(["HARDWARE_PIN_CAPABILITY_MISMATCH"]);
			});

			it.each([3, 5, 6, 9, 10, 11])(
				"accepts an analog output on %%PD%i",
				(n) => {
					expect(
						codes(projectWith([variable("dim", "analog-output", `%PD${n}`)])),
					).toEqual([]);
				},
			);
		});

		describe("HARDWARE_MEMORY_VARIABLE_ON_PIN", () => {
			it.each(["%PD2", "%PA0", "%PD0"])(
				"reports a memory variable at the pin address %s",
				(address) => {
					const project = projectWith([variable("m", "memory", address)]);
					const issues = analyseHardwareTarget(project);
					expect(issues.map((i) => i.code)).toEqual([
						"HARDWARE_MEMORY_VARIABLE_ON_PIN",
					]);
					expect(issues[0].params).toMatchObject({
						variableName: "m",
						address,
					});
				},
			);
		});

		describe("HARDWARE_PIN_DUPLICATE", () => {
			it("reports one issue per duplicated pin, naming every variable", () => {
				const project = projectWith([
					variable("a", "logic-input", "%PD2"),
					variable("b", "logic-output", "%PD2"),
					variable("c", "logic-input", "%PD2"),
					variable("ok", "logic-input", "%PD3"),
					variable("x", "logic-input", "%PA0"),
					variable("y", "logic-output", "%PA0"),
				]);
				const issues = analyseHardwareTarget(project);
				expect(issues.map((i) => i.code)).toEqual([
					"HARDWARE_PIN_DUPLICATE",
					"HARDWARE_PIN_DUPLICATE",
				]);
				expect(issues[0].params).toMatchObject({
					address: "%PD2",
					variableNames: "a, b, c",
				});
				expect(issues[1].params).toMatchObject({
					address: "%PA0",
					variableNames: "x, y",
				});
			});

			it("does not count a variable already rejected for another reason", () => {
				const project = projectWith([
					variable("pot", "analog-input", "%PD5"),
					variable("btn", "logic-input", "%PD5"),
				]);
				expect(codes(project)).toEqual(["HARDWARE_PIN_CAPABILITY_MISMATCH"]);
			});
		});

		it("reports each faulty variable independently", () => {
			const project = projectWith([
				variable("a", "logic-input", "%PD0"),
				variable("b", "logic-input", "%I0.0"),
				variable("c", "memory", "%PD4"),
			]);
			expect(codes(project)).toEqual([
				"HARDWARE_PIN_RESERVED",
				"HARDWARE_PIN_UNKNOWN",
				"HARDWARE_MEMORY_VARIABLE_ON_PIN",
			]);
		});

		it("reports every issue at project level, on the project id", () => {
			const project = projectWith([variable("a", "logic-input", "%PD0")]);
			expect(analyseHardwareTarget(project)[0].source).toEqual({
				sourceType: "project",
				sourceId: "p1",
			});
			expect(analyseHardwareTarget(project)[0].severity).toBe("error");
		});
	});

	describe("through ProjectAnalyser.analyse", () => {
		it("includes the hardware issues in the analysis result", () => {
			const project = projectWith([variable("rx", "logic-input", "%PD0")]);
			const result = ProjectAnalyser.analyse(project);
			expect(result.issues.map((i) => i.code)).toContain(
				"HARDWARE_PIN_RESERVED",
			);
		});

		it("adds nothing for a project without a target", () => {
			const project = projectWith(
				[variable("rx", "logic-input", "%PD0")],
				null,
			);
			const result = ProjectAnalyser.analyse(project);
			expect(
				result.issues.filter((i) => i.code.startsWith("HARDWARE_")),
			).toEqual([]);
		});
	});

	describe("HARDWARE_INPUT_UNBOUND", () => {
		const withGrafcetReading = (
			variables: ReturnType<typeof variable>[],
			expression: string,
			hardwareTarget: Project["hardwareTarget"] = { modelId: "arduino-uno-r3" },
		) => {
			const project = projectWith(variables, hardwareTarget);
			project.addProgram(
				new GrafcetBuilder()
					.id("g1")
					.name("G")
					.addTransition(
						new TransitionBuilder().id("t1").expression(expression).build(),
					)
					.build(),
			);
			return project;
		};
		const unbound = (project: Project) =>
			analyseHardwareTarget(project).filter(
				(i) => i.code === "HARDWARE_INPUT_UNBOUND",
			);

		it("warns about an input read by a program that has no address", () => {
			const issues = unbound(
				withGrafcetReading([variable("E1", "logic-input")], "E1"),
			);
			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("warning");
			expect(issues[0].params).toEqual({
				variableName: "E1",
				device: "Arduino Uno R3",
			});
		});

		it("warns about an analog input too", () => {
			expect(
				unbound(withGrafcetReading([variable("P1", "analog-input")], "P1 > 3")),
			).toHaveLength(1);
		});

		it("does not warn about an input that has an address", () => {
			expect(
				unbound(
					withGrafcetReading([variable("E1", "logic-input", "%PD2")], "E1"),
				),
			).toEqual([]);
		});

		it("does not warn about an input no program reads", () => {
			expect(
				unbound(
					withGrafcetReading(
						[variable("E1", "logic-input"), variable("E2", "logic-input")],
						"E2 ET E2",
					),
				).map((i) => i.params.variableName),
			).toEqual(["E2"]);
		});

		it("does not warn about outputs or memory variables", () => {
			expect(
				unbound(
					withGrafcetReading(
						[variable("S1", "logic-output"), variable("M1", "memory")],
						"S1 ET M1",
					),
				),
			).toEqual([]);
		});

		it("ignores a program excluded from execution", () => {
			const project = withGrafcetReading([variable("E1", "logic-input")], "E1");
			project.grafcets["g1"].excludedFromExecution = true;
			expect(unbound(project)).toEqual([]);
		});

		it("says nothing without a hardware target", () => {
			expect(
				unbound(
					withGrafcetReading([variable("E1", "logic-input")], "E1", null),
				),
			).toEqual([]);
		});

		it("is reported by the whole project analysis", () => {
			const result = ProjectAnalyser.analyse(
				withGrafcetReading([variable("E1", "logic-input")], "E1"),
			);
			expect(
				result.issues.find((i) => i.code === "HARDWARE_INPUT_UNBOUND")
					?.severity,
			).toBe("warning");
		});
	});
});
