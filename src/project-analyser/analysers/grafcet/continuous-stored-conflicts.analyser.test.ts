import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { CoilType, createCoilElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Section from "@/schemas/ladder/section.schema";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import analyseContinuousStoredConflicts from "./continuous-stored-conflicts.analyser";

const { CONTINUOUS, SET, RESET, RISING_EDGE, FALLING_EDGE } =
	ActionExecutionMode;

/** A grafcet whose step 0 and step 1 carry an action on `q0` / `q1` with the given modes. */
function grafcet(
	id: string,
	q0: string,
	m0: ActionExecutionMode,
	q1 = "",
	m1: ActionExecutionMode = SET,
) {
	const result = GrafcetFactory.createCycleWithBooleanActions(
		id,
		q0,
		q1,
		"VRAI",
		"VRAI",
		m0,
		m1,
	);
	result.name = id;
	return result;
}

function analyse(
	grafcets: ReturnType<typeof grafcet>[],
	coils: [variable: string, type: CoilType][] = [],
) {
	const project = ProjectFactory.create([], grafcets);
	if (coils.length > 0) {
		const elements = coils.map(([variable, type], row) =>
			createCoilElement(variable, type, row, 1),
		);
		project.addProgram(
			new Ladder("l1", "L1", [new Section("s", "S", "", elements)]),
		);
	}
	return analyseContinuousStoredConflicts(project);
}

describe("analyseContinuousStoredConflicts", () => {
	beforeEach(() => ProjectFactory.reset());

	it.each([SET, RISING_EDGE, FALLING_EDGE])(
		"reports a %s action on a variable driven by a continuous action of the same grafcet",
		(mode) => {
			const issues = analyse([grafcet("g", "M", CONTINUOUS, "M", mode)]);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].code).toBe("ACTION_STORED_OVERRIDDEN_BY_CONTINUOUS");
			expect(issues[0].source).toEqual({
				sourceType: "grafcet-action",
				sourceId: "g-action-1",
				parentId: "g",
			});
			expect(issues[0].params).toEqual({
				variableName: "M",
				programNames: "g",
			});
		},
	);

	it("reports it when the continuous action belongs to another grafcet", () => {
		const issues = analyse([
			grafcet("g1", "M", SET),
			grafcet("g2", "M", CONTINUOUS),
		]);

		expect(issues.map((i) => i.source.parentId)).toEqual(["g1"]);
		expect(issues[0].params.programNames).toBe("g2");
	});

	it("lists each grafcet driving the variable once", () => {
		const issues = analyse([
			grafcet("g1", "M", SET),
			grafcet("g2", "M", CONTINUOUS, "M", CONTINUOUS),
			grafcet("g3", "M", CONTINUOUS),
		]);

		expect(issues[0].params.programNames).toBe("g2, g3");
	});

	it("reports every overridden action, one issue each", () => {
		const issues = analyse([
			grafcet("g1", "M", SET, "M", RISING_EDGE),
			grafcet("g2", "M", CONTINUOUS),
		]);

		expect(issues).toHaveLength(2);
	});

	describe("no diagnostic", () => {
		it("accepts a RESET next to a continuous action (redundant, harmless)", () => {
			expect(analyse([grafcet("g", "M", CONTINUOUS, "M", RESET)])).toEqual([]);
		});

		it("accepts several continuous actions on the same variable", () => {
			expect(analyse([grafcet("g", "M", CONTINUOUS, "M", CONTINUOUS)])).toEqual(
				[],
			);
		});

		it("accepts a SET in one step and a RESET in another", () => {
			expect(analyse([grafcet("g", "M", SET, "M", RESET)])).toEqual([]);
		});

		it("accepts writers on different variables", () => {
			expect(analyse([grafcet("g", "M", CONTINUOUS, "N", SET)])).toEqual([]);
		});

		it.each<CoilType>([
			"normal",
			"inverted",
			"set",
			"reset",
			"rising",
			"falling",
		])(
			"leaves the ladder coils (%s) out, whatever the grafcet actions",
			(type) => {
				expect(
					analyse(
						[
							grafcet("g1", "M", SET, "M", RESET),
							grafcet("g2", "N", CONTINUOUS),
						],
						[
							["M", type],
							["N", type],
						],
					),
				).toEqual([]);
			},
		);

		it("ignores grafcets excluded from the execution", () => {
			const g2 = grafcet("g2", "M", CONTINUOUS);
			g2.excludedFromExecution = true;

			expect(analyse([grafcet("g1", "M", SET), g2])).toEqual([]);
		});

		it("ignores a continuous action not connected to any step", () => {
			const g2 = grafcet("g2", "M", CONTINUOUS);
			g2.connections = g2.connections.filter((c) => c.target.type !== "action");

			expect(analyse([grafcet("g1", "M", SET), g2])).toEqual([]);
		});
	});
});
