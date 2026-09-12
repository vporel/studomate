/**
 * @jest-environment jsdom
 */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { renderHook } from "@testing-library/react";
import {
	useHmiPositionAnimationOffset,
	useHmiSimulationValue,
} from "./use-hmi-widget-simulation";

jest.mock("@/ui/components/projects/ProjectContext");

function mockStates(
	states: Record<string, { id: string; mnemonic: string; value: unknown }>,
) {
	const simulationVariablesStatesByMnemonic = Object.fromEntries(
		Object.values(states).map((s) => [s.mnemonic, s]),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ simulationVariablesStatesByMnemonic }),
	);
}

describe("useHmiSimulationValue", () => {
	afterEach(() => jest.clearAllMocks());

	it("retourne undefined quand le mnémonique est absent", () => {
		mockStates({});
		const { result } = renderHook(() => useHmiSimulationValue(undefined));
		expect(result.current).toBeUndefined();
	});

	it("retourne la valeur brute de la variable résolue par mnémonique", () => {
		mockStates({ v1: { id: "v1", mnemonic: "CPT", value: 7 } });
		const { result } = renderHook(() => useHmiSimulationValue("CPT"));
		expect(result.current).toBe(7);
	});

	it("retourne undefined quand la variable n'est pas dans l'état de simulation", () => {
		mockStates({ v1: { id: "v1", mnemonic: "CPT", value: 7 } });
		const { result } = renderHook(() => useHmiSimulationValue("AUTRE"));
		expect(result.current).toBeUndefined();
	});
});

describe("useHmiPositionAnimationOffset", () => {
	afterEach(() => jest.clearAllMocks());

	function widgetWithPositionAnimation(
		position: { xVariable?: string; yVariable?: string } | undefined,
	) {
		const widget = HmiWidget.create("push-button", 0, 0);
		if (position)
			widget.data = { ...widget.data, animations: { position } };
		return widget;
	}

	it("retourne undefined hors simulation", () => {
		mockStates({ v1: { id: "v1", mnemonic: "X", value: 10 } });
		const widget = widgetWithPositionAnimation({ xVariable: "X" });
		const { result } = renderHook(() =>
			useHmiPositionAnimationOffset(widget, false),
		);
		expect(result.current).toBeUndefined();
	});

	it("retourne undefined si le widget ne porte aucune animation de position", () => {
		mockStates({});
		const widget = widgetWithPositionAnimation(undefined);
		const { result } = renderHook(() =>
			useHmiPositionAnimationOffset(widget, true),
		);
		expect(result.current).toBeUndefined();
	});

	it("résout dx/dy indépendamment à partir des variables pilotes", () => {
		mockStates({
			vx: { id: "vx", mnemonic: "X", value: 12 },
			vy: { id: "vy", mnemonic: "Y", value: -5 },
		});
		const widget = widgetWithPositionAnimation({
			xVariable: "X",
			yVariable: "Y",
		});
		const { result } = renderHook(() =>
			useHmiPositionAnimationOffset(widget, true),
		);
		expect(result.current).toEqual({ dx: 12, dy: -5 });
	});

	it("retombe sur 0 quand une variable pilote est introuvable", () => {
		mockStates({});
		const widget = widgetWithPositionAnimation({ xVariable: "INCONNUE" });
		const { result } = renderHook(() =>
			useHmiPositionAnimationOffset(widget, true),
		);
		expect(result.current).toEqual({ dx: 0, dy: 0 });
	});
});
