/**
 * @jest-environment jsdom
 */
import { HmiStyleAnimation } from "@/schemas/hmi/hmi-widget.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderHook } from "@testing-library/react";
import useHmiStyleAnimation from "./useHmiStyleAnimation";

jest.mock("@/ui/components/projects/ProjectContext");

function mockSimulationVariablesStates(states: Record<string, { id: string; mnemonic: string; value: unknown }>) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ simulationVariablesStates: states }),
	);
}

describe("useHmiStyleAnimation", () => {
	it("retourne un objet vide si aucune animation n'est fournie", () => {
		mockSimulationVariablesStates({});
		const { result } = renderHook(() => useHmiStyleAnimation<"fill">(undefined));
		expect(result.current).toEqual({});
	});

	it("retourne un objet vide si la variable pilote est introuvable", () => {
		mockSimulationVariablesStates({});
		const animation: HmiStyleAnimation<"fill"> = {
			variableMnemonic: "CPT",
			rows: [{ value: 0, properties: { fill: "#fff" } }],
		};
		const { result } = renderHook(() => useHmiStyleAnimation(animation));
		expect(result.current).toEqual({});
	});

	it("retourne les propriétés de la ligne dont la valeur correspond exactement à la variable", () => {
		mockSimulationVariablesStates({ v1: { id: "v1", mnemonic: "CPT", value: 2 } });
		const animation: HmiStyleAnimation<"fill"> = {
			variableMnemonic: "CPT",
			rows: [
				{ value: 0, properties: { fill: "#fff" } },
				{ value: 2, properties: { fill: "#f00" } },
			],
		};
		const { result } = renderHook(() => useHmiStyleAnimation(animation));
		expect(result.current).toEqual({ fill: "#f00" });
	});

	it("retourne un objet vide si aucune ligne ne correspond exactement", () => {
		mockSimulationVariablesStates({ v1: { id: "v1", mnemonic: "CPT", value: 5 } });
		const animation: HmiStyleAnimation<"fill"> = {
			variableMnemonic: "CPT",
			rows: [{ value: 0, properties: { fill: "#fff" } }],
		};
		const { result } = renderHook(() => useHmiStyleAnimation(animation));
		expect(result.current).toEqual({});
	});

	it("compare une variable booléenne comme 0/1", () => {
		mockSimulationVariablesStates({ v1: { id: "v1", mnemonic: "MARCHE", value: true } });
		const animation: HmiStyleAnimation<"fill"> = {
			variableMnemonic: "MARCHE",
			rows: [
				{ value: 0, properties: { fill: "#fff" } },
				{ value: 1, properties: { fill: "#0f0" } },
			],
		};
		const { result } = renderHook(() => useHmiStyleAnimation(animation));
		expect(result.current).toEqual({ fill: "#0f0" });
	});
});
