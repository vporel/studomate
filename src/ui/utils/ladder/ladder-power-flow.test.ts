import Ladder from "@/schemas/ladder/ladder.schema";
import { computeEnergizedEdges } from "./ladder-power-flow";
import { SimulationVariableState } from "@/ui/stores/project/project.store";
import Connection from "@/schemas/ladder/connection.schema";
import { getContactMemoryVariableId } from "@/project-analyser/analysers/ladder/ladder.analyser";

describe("computeEnergizedEdges", () => {
	let ladder: Ladder;
	let sectionId: string;

	beforeEach(() => {
		ladder = new Ladder("ladder1", "Test Ladder");
		sectionId = ladder.sections[0].id;
	});

	it("should energize edge directly connected to railTerminal", () => {
		ladder.addElements(sectionId, [
			{ id: "rail1", type: "railTerminal", data: {}, position: { row: 0, col: 0 } },
			{ id: "coil1", type: "coil", data: { variable: "Q1", mode: "normal" }, position: { row: 0, col: 1 } },
		]);
		ladder.addConnections(sectionId, [
			new Connection("c1", { id: "rail1", type: "railTerminal", handle: "source" }, { id: "coil1", type: "coil", handle: "target" }),
		]);

		const variablesState: Record<string, SimulationVariableState> = {};
		const energized = computeEnergizedEdges(ladder, variablesState);

		expect(energized.has("c1")).toBe(true);
	});

	it("should energize NO contact's output only when variable is true", () => {
		ladder.addElements(sectionId, [
			{ id: "rail1", type: "railTerminal", data: {}, position: { row: 0, col: 0 } },
			{ id: "contact1", type: "contact", data: { variable: "I1", mode: "NO" }, position: { row: 0, col: 1 } },
			{ id: "coil1", type: "coil", data: { variable: "Q1", mode: "normal" }, position: { row: 0, col: 2 } },
		]);
		ladder.addConnections(sectionId, [
			new Connection("c1", { id: "rail1", type: "railTerminal", handle: "source" }, { id: "contact1", type: "contact", handle: "target" }),
			new Connection("c2", { id: "contact1", type: "contact", handle: "source" }, { id: "coil1", type: "coil", handle: "target" }),
		]);

		let energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: false } });
		expect(energized.has("c1")).toBe(true);
		expect(energized.has("c2")).toBe(false);

		energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: true } });
		expect(energized.has("c1")).toBe(true);
		expect(energized.has("c2")).toBe(true);
	});

	it("should energize NF contact's output only when variable is false", () => {
		ladder.addElements(sectionId, [
			{ id: "rail1", type: "railTerminal", data: {}, position: { row: 0, col: 0 } },
			{ id: "contact1", type: "contact", data: { variable: "I1", mode: "NF" }, position: { row: 0, col: 1 } },
		]);
		ladder.addElements(sectionId, [{ id: "coil1", type: "coil", data: { variable: "Q1", mode: "normal" }, position: { row: 0, col: 2 } }]);

		ladder.addConnections(sectionId, [
			new Connection("c1", { id: "rail1", type: "railTerminal", handle: "source" }, { id: "contact1", type: "contact", handle: "target" }),
			new Connection("c2", { id: "contact1", type: "contact", handle: "source" }, { id: "coil1", type: "coil", handle: "target" }),
		]); 

		let energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: false } });
		expect(energized.has("c2")).toBe(true);

		energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: true } });
		expect(energized.has("c2")).toBe(false);
	});

	it("should energize P contact only when variable is true AND memory is false", () => {
		ladder.addElements(sectionId, [
			{ id: "rail1", type: "railTerminal", data: {}, position: { row: 0, col: 0 } },
			{ id: "contact1", type: "contact", data: { variable: "I1", mode: "P" }, position: { row: 0, col: 1 } },
			{ id: "coil1", type: "coil", data: { variable: "Q1", mode: "normal" }, position: { row: 0, col: 2 } },
		]);
		ladder.addConnections(sectionId, [
			new Connection("c1", { id: "rail1", type: "railTerminal", handle: "source" }, { id: "contact1", type: "contact", handle: "target" }),
			new Connection("c2", { id: "contact1", type: "contact", handle: "source" }, { id: "coil1", type: "coil", handle: "target" }),
		]);

		const memVar = getContactMemoryVariableId(ladder.id, "contact1");

		// Variable false -> no power
		let energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: false }, [memVar]: { id: memVar, mnemonic: memVar, value: false } });
		expect(energized.has("c2")).toBe(false);

		// Variable true, memVar false -> P pulse! power passes
		energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: true }, [memVar]: { id: memVar, mnemonic: memVar, value: false } });
		expect(energized.has("c2")).toBe(true);

		// Variable true, memVar true -> pulse ended, power blocks
		energized = computeEnergizedEdges(ladder, { I1: { id: "I1", mnemonic: "I1", value: true }, [memVar]: { id: memVar, mnemonic: memVar, value: true } });
		expect(energized.has("c2")).toBe(false);
	});
});
