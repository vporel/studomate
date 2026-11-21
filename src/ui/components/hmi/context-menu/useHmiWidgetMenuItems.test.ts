/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { renderHook } from "@testing-library/react";
import { selectorImplementation } from "@tests/utils/store-mocks";
import useHmiWidgetMenuItems from "./useHmiWidgetMenuItems";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/i18n/useT", () => {
	const t = (key: string) => key;
	return { useT: () => t };
});

const widget = (id: string, stackOrder: number) =>
	({ id, stackOrder }) as unknown as HmiWidget;

function setup(selectedWidgetIds: string[], stackOrders: number[] = [1, 2, 3]) {
	const widgets = Object.fromEntries(
		stackOrders.map((order, i) => [`w${i + 1}`, widget(`w${i + 1}`, order)]),
	);
	const actions = {
		copyCutPasteManager: {
			copySelectedElements: jest.fn(),
			cutSelectedElements: jest.fn(),
		},
		removeSelectedWidgets: jest.fn(),
		alignSelectedWidgets: jest.fn(),
		bringForward: jest.fn(),
		sendBackward: jest.fn(),
		bringToFront: jest.fn(),
		sendToBack: jest.fn(),
	};
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({
			...actions,
			selectedWidgetIds,
			hmiPage: { widgets },
		}),
	);
	const { result } = renderHook(() => useHmiWidgetMenuItems());
	return { groups: result.current(), actions };
}

const labels = (group: { label?: string }[]) => group.map((i) => i.label);

describe("useHmiWidgetMenuItems", () => {
	it("ne propose que copier/couper et supprimer sans sélection", () => {
		const { groups } = setup([]);

		expect(groups).toHaveLength(2);
		expect(labels(groups[0])).toEqual(["copy", "cut"]);
		expect(labels(groups[1])).toEqual(["delete"]);
	});

	it("déclenche copie, coupe et suppression sur la sélection", () => {
		const { groups, actions } = setup([]);

		groups[0][0].onClick?.();
		groups[0][1].onClick?.();
		groups[1][0].onClick?.();

		expect(actions.copyCutPasteManager.copySelectedElements).toHaveBeenCalled();
		expect(actions.copyCutPasteManager.cutSelectedElements).toHaveBeenCalled();
		expect(actions.removeSelectedWidgets).toHaveBeenCalled();
	});

	it("ajoute le groupe d'ordre d'empilement pour un seul widget", () => {
		const { groups } = setup(["w2"]);

		expect(groups).toHaveLength(3);
		expect(labels(groups[1])).toEqual([
			"bringForward",
			"bringToFront",
			"sendBackward",
			"sendToBack",
		]);
		expect(groups[1].map((i) => i.disabled)).toEqual([
			false,
			false,
			false,
			false,
		]);
	});

	it("déclenche les actions d'empilement sur l'identifiant du widget", () => {
		const { groups, actions } = setup(["w2"]);

		groups[1].forEach((item) => item.onClick?.());

		expect(actions.bringForward).toHaveBeenCalledWith("w2");
		expect(actions.bringToFront).toHaveBeenCalledWith("w2");
		expect(actions.sendBackward).toHaveBeenCalledWith("w2");
		expect(actions.sendToBack).toHaveBeenCalledWith("w2");
	});

	it("grise 'vers l'avant' pour le widget le plus en avant", () => {
		const { groups } = setup(["w3"]);

		expect(groups[1].map((i) => i.disabled)).toEqual([
			true,
			true,
			false,
			false,
		]);
	});

	it("grise 'vers l'arrière' pour le widget le plus en arrière", () => {
		const { groups } = setup(["w1"]);

		expect(groups[1].map((i) => i.disabled)).toEqual([
			false,
			false,
			true,
			true,
		]);
	});

	it("grise les quatre entrées quand le widget est seul", () => {
		const { groups } = setup(["w1"], [5]);

		expect(groups[1].every((i) => i.disabled)).toBe(true);
	});

	it("omet le groupe d'empilement si le widget sélectionné n'existe pas", () => {
		const { groups } = setup(["inconnu"]);

		expect(groups).toHaveLength(2);
	});

	it("propose l'alignement, sans empilement, pour plusieurs widgets", () => {
		const { groups } = setup(["w1", "w2"]);

		expect(groups).toHaveLength(3);
		expect(labels(groups[1])).toEqual(["alignment"]);
		expect(
			labels((groups[1][0].subItems ?? []) as { label?: string }[]),
		).toEqual([
			"alignTop",
			"alignBottom",
			"alignMiddle",
			undefined,
			"alignLeft",
			"alignRight",
			"alignCenter",
		]);
	});

	it("déclenche l'alignement correspondant à chaque sous-entrée", () => {
		const { groups, actions } = setup(["w1", "w2"]);
		const subItems = (groups[1][0].subItems ?? []) as ContextMenuItemType[];

		subItems.forEach((item) => item.onClick?.());

		expect(
			actions.alignSelectedWidgets.mock.calls.map((c: unknown[]) => c[0]),
		).toEqual([
			"top",
			"bottom",
			"center-vertical",
			"left",
			"right",
			"center-horizontal",
		]);
	});
});
