import { identityT } from "@tests/utils/i18n";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import stepContextMenuItems from "./step-context-menu-items";

function itemsFor(grafcet: Grafcet, inSimulation: boolean) {
	return stepContextMenuItems({ id: "step-1" } as any, identityT, {
		inSimulation,
		grafcet,
		workflowManager: {} as any,
		stepVariableId: "g1-step-1",
		simulationManager: {} as any,
		forcedVariables: {},
	});
}

function labelsOf(groups: ReturnType<typeof itemsFor>): unknown[] {
	return groups.flat().map((item) => ("label" in item ? item.label : null));
}

describe("stepContextMenuItems", () => {
	it("offers step forcing in simulation", () => {
		expect(labelsOf(itemsFor(new Grafcet("g1", "G"), true))).toEqual([
			"forceActive",
			"forceInactive",
			"releaseForce",
		]);
	});

	it("offers no forcing in simulation for a grafcet excluded from execution", () => {
		const grafcet = new Grafcet("g1", "G");
		grafcet.excludedFromExecution = true;

		expect(itemsFor(grafcet, true)).toEqual([]);
	});

	it("keeps the design items for a grafcet excluded from execution", () => {
		const grafcet = new Grafcet("g1", "G");
		grafcet.excludedFromExecution = true;

		expect(labelsOf(itemsFor(grafcet, false))).toEqual([
			"addAction",
			"addTransition",
		]);
	});
});
