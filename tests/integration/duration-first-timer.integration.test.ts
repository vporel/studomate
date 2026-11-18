import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compileProject,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

/** E0 (initial) ─[receptivity]→ E1 ─[hold]→ E0, `hold` staying false so that E1 is kept. */
function buildProject(receptivity: string) {
	const grafcet = GrafcetFactory.createSimpleCycle("g", receptivity, "hold");
	return ProjectFactory.create(
		[VariableFactory.createLogicInput("hold")],
		[grafcet],
	);
}

describe("Timer written duration first (5s/X1)", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	async function x1AfterEachCycle(receptivity: string): Promise<boolean[]> {
		const plc = compileToPLC(buildProject(receptivity), 100, Dialect.FR);
		if (!plc) throw new Error(`compilation failed for ${receptivity}`);
		plc.start();
		plc.pause();
		plc.stepOnce();
		plc.resume();

		const values: boolean[] = [];
		for (let cycle = 0; cycle < 6; cycle++) {
			await jest.advanceTimersByTimeAsync(100);
			values.push(getVariableValue(plc, "X1") as boolean);
		}
		plc.stop();
		return values;
	}

	it("crosses the transition on the same cycle as the named form t0/X0/250ms", async () => {
		const named = await x1AfterEachCycle("t0/X0/250ms");
		const anonymous = await x1AfterEachCycle("250ms/X0");

		expect(anonymous).toEqual([false, false, false, true, true, true]);
		expect(anonymous).toEqual(named);
	});

	it("exposes the elapsed time of the unnamed timer under its formatted duration", () => {
		const compiled = compileProject(buildProject("250ms/X0"), Dialect.FR);
		if (!compiled) throw new Error("compilation failed");

		const labels = compiled.observableExpressionVariableIds["g-trans-0"]
			.map((ref) => ref.label)
			.filter((label) => label !== null);
		expect(labels).toEqual(["250ms"]);
	});

	it("does not compile a project mixing both forms in a single timer (t0/250ms/X0)", () => {
		expect(compileProject(buildProject("t0/250ms/X0"), Dialect.FR)).toBeNull();
	});
});
