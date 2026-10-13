import { PROJECT_TEMPLATES } from "@/templates";
import { compiledProject, plcVariable } from "@tests/utils/bytecode-program";
import { compileProject } from "@tests/utils/test-helpers";
import { compareSimulatorAndVm } from "@tests/utils/vm-conformity";
import BytecodeGenerationError from "./bytecode.error";

jest.useFakeTimers();

/** Templates using a type the Uno R3 cannot run: the generator must refuse them. */
const NOT_EMBEDDABLE = ["ladder-scaling"];

const SOLUTIONS = PROJECT_TEMPLATES.flatMap((template) =>
	template.solution ? [{ id: template.id, create: template.solution }] : [],
);

describe("simulator ↔ VM conformity on templates", () => {
	it.each(
		SOLUTIONS.filter(({ id }) => !NOT_EMBEDDABLE.includes(id)).map(
			(solution) => [solution.id, solution] as const,
		),
	)(
		"%s",
		(_id, solution) => {
			const compiled = compileProject(solution.create());
			expect(compiled).not.toBeNull();
			for (const [seed, changeProbability] of [
				[1, 0.05],
				[2, 0.3],
			] as const) {
				const report = compareSimulatorAndVm(compiled!, {
					cycles: 600,
					seed,
					changeProbability,
				});
				expect(report.mismatches).toEqual([]);
				expect(report.vmFaultCycle).toBe(report.simulatorFaultCycle);
				expect(report.comparedVariables).toBeGreaterThan(0);
				expect(report.cyclesCompared).toBeGreaterThan(0);
				expect(report.distinctStates).toBeGreaterThan(1);
			}
		},
		60_000,
	);

	it.each(NOT_EMBEDDABLE)("refuses %s, which uses REAL", (id) => {
		const solution = SOLUTIONS.find((candidate) => candidate.id === id)!;
		const compiled = compileProject(solution.create());
		expect(() =>
			compareSimulatorAndVm(compiled!, {
				cycles: 1,
				seed: 1,
				changeProbability: 0,
			}),
		).toThrow(BytecodeGenerationError);
	});
});

describe("simulator ↔ VM conformity on typed programs", () => {
	const typedProgram = () =>
		compiledProject({
			variables: [
				plcVariable("i1:INT", "input"),
				plcVariable("i2:INT", "input"),
				plcVariable("d1:DINT", "input"),
				plcVariable("d2:DINT", "input"),
				plcVariable("w1:WORD", "input"),
				plcVariable("w2:WORD", "input"),
				plcVariable("dw1:DWORD", "input"),
				plcVariable("t1:TIME", "input"),
				plcVariable("oi:INT"),
				plcVariable("od:DINT"),
				plcVariable("ow:WORD"),
				plcVariable("odw:DWORD"),
				plcVariable("ot:TIME"),
				plcVariable("m:internal-number"),
				plcVariable("b1:BOOL"),
				plcVariable("b2:BOOL"),
				plcVariable("b3:BOOL"),
			],
			routines: [
				[
					"oi := i1 + i2",
					"oi := oi * i1",
					"od := d1 * d2",
					"od := od - INT_TO_DINT(i1)",
					"od := od + d1 * 7 - d2",
					"ow := INT_TO_WORD(oi)",
					"odw := DINT_TO_DWORD(od)",
					"odw := WORD_TO_DWORD(w1)",
					"ot := t1 / 3",
					"ot := ot + t1 * 2",
					"m := i1 * 30000",
					"m := -m + 7",
					"b1 := w1 > w2",
					"b2 := dw1 >= 3000000000",
					"b3 := i1 < i2 OR d1 != d2 AND w1 <= 40000",
					"oi := DINT_TO_INT(d1 / (INT_TO_DINT(i2) * 0 + 7))",
					"od := d1 / -3",
				],
			],
		});

	it.each([
		[1, 0.1],
		[2, 0.5],
		[3, 1],
	])(
		"matches on typed arithmetic and comparisons (seed %i)",
		(seed, changeProbability) => {
			const report = compareSimulatorAndVm(typedProgram(), {
				cycles: 400,
				seed,
				changeProbability,
			});
			expect(report.mismatches).toEqual([]);
			expect(report.simulatorFaultCycle).toBeNull();
			expect(report.vmFaultCycle).toBeNull();
			expect(report.distinctStates).toBeGreaterThan(50);
		},
	);

	it("faults on the same cycle on a division by zero", () => {
		const compiled = compiledProject({
			variables: [
				plcVariable("cnt:INT"),
				plcVariable("oi:INT"),
				plcVariable("a:BOOL"),
			],
			routines: [["cnt := cnt + 1", "a := true", "oi := 10 / (3 - cnt)"]],
		});
		const report = compareSimulatorAndVm(compiled, {
			cycles: 10,
			seed: 1,
			changeProbability: 0,
		});
		expect(report.simulatorFaultCycle).toBe(2);
		expect(report.vmFaultCycle).toBe(2);
		expect(report.mismatches).toEqual([]);
	});

	it("keeps a forced variable at its value, then lets the program write it again", () => {
		const compiled = compiledProject({
			variables: [
				plcVariable("i:INT"),
				plcVariable("big:BOOL"),
				plcVariable("t:internal-number"),
				plcVariable("q:BOOL"),
			],
			routines: [
				["i := i + 1", "big := i > 5", "t := t + 100", "q := t >= 500"],
			],
		});
		const report = compareSimulatorAndVm(compiled, {
			cycles: 30,
			seed: 1,
			changeProbability: 0,
			forces: [
				{ cycle: 3, name: "i", value: 2 },
				{ cycle: 12, name: "i" },
				{ cycle: 14, name: "q", value: true },
				{ cycle: 20, name: "t", value: 0 },
				{ cycle: 25, name: "t" },
				{ cycle: 26, name: "q" },
			],
		});
		expect(report.mismatches).toEqual([]);
		expect(report.distinctStates).toBeGreaterThan(10);
	});

	it("forces the variables of a template as the simulator does", () => {
		const compiled = compileProject(
			PROJECT_TEMPLATES.find((t) => t.id === "traffic-light")!.solution!(),
		)!;
		const stepNames = compiled.variables
			.map((variable) => variable.getName())
			.filter((name) => /^X\d/.test(name));
		const report = compareSimulatorAndVm(compiled, {
			cycles: 300,
			seed: 3,
			changeProbability: 0.1,
			forces: [
				{ cycle: 40, name: stepNames[0], value: true },
				{ cycle: 120, name: stepNames[0] },
			],
		});
		expect(report.mismatches).toEqual([]);
	});
});
