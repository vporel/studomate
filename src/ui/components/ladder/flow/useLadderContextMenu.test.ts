/**
 * @jest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import Section from "@/schemas/ladder/section.schema";
import { createContactElement } from "@/schemas/ladder/element.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import mitt from "mitt";
import useLadderContextMenu from "./useLadderContextMenu";
import { LadderContextMenuEvents } from "../context/context-menu-events";

// Mock useReactFlow
const mockScreenToFlowPosition = jest.fn((pos) => pos);
jest.mock("@xyflow/react", () => ({
	...jest.requireActual("@xyflow/react"),
	useReactFlow: () => ({ screenToFlowPosition: mockScreenToFlowPosition }),
}));

// Mock useLadderContext
const mockContextMenuEvents = mitt<LadderContextMenuEvents>();
jest.mock("../context/LadderContext", () => ({
	useLadderContext: () => ({ contextMenuEvents: mockContextMenuEvents }),
}));

function fakeMouseEvent(clientX: number, clientY: number) {
	return { preventDefault: jest.fn(), clientX, clientY } as any;
}

describe("useLadderContextMenu", () => {
	afterEach(() => {
		jest.clearAllMocks();
		mockContextMenuEvents.all.clear();
	});

	it("n'émet pas show pour un nœud hors du mode DESIGN", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		const showSpy = jest.fn();
		mockContextMenuEvents.on("show", showSpy);

		const { result } = renderHook(() => useLadderContextMenu(section, ProjectMode.SIMULATION));
		act(() => result.current.openNodeContextMenu(fakeMouseEvent(10, 20), { id: contact.id, position: { x: 0, y: 0 } } as any));

		expect(showSpy).not.toHaveBeenCalled();
	});

	it("n'émet pas show pour un nœud virtuel (absent du schéma)", () => {
		const section = new Section("s1", "S");
		const showSpy = jest.fn();
		mockContextMenuEvents.on("show", showSpy);

		const { result } = renderHook(() => useLadderContextMenu(section, ProjectMode.DESIGN));
		act(() => result.current.openNodeContextMenu(fakeMouseEvent(10, 20), { id: "virtual-rail-0", position: { x: 0, y: 0 } } as any));

		expect(showSpy).not.toHaveBeenCalled();
	});

	it("émet show pour un nœud réel en mode DESIGN", () => {
		const section = new Section("s1", "S");
		const contact = createContactElement("A", "NO", 0, 0);
		section.elements = [contact];
		const showSpy = jest.fn();
		mockContextMenuEvents.on("show", showSpy);

		const { result } = renderHook(() => useLadderContextMenu(section, ProjectMode.DESIGN));
		act(() => result.current.openNodeContextMenu(fakeMouseEvent(10, 20), { id: contact.id, position: { x: 0, y: 0 } } as any));

		expect(showSpy).toHaveBeenCalledWith(
			expect.objectContaining({ element: expect.objectContaining({ id: contact.id }) }),
		);
	});

	it("émet show pour une arête en mode DESIGN", () => {
		const section = new Section("s1", "S");
		const showSpy = jest.fn();
		mockContextMenuEvents.on("show", showSpy);

		const { result } = renderHook(() => useLadderContextMenu(section, ProjectMode.DESIGN));
		act(() => result.current.openEdgeContextMenu(fakeMouseEvent(5, 6), { id: "c1" } as any));

		expect(showSpy).toHaveBeenCalledWith(
			expect.objectContaining({ element: expect.objectContaining({ id: "c1" }) }),
		);
	});

	it("émet hide via closeContextMenu", () => {
		const section = new Section("s1", "S");
		const hideSpy = jest.fn();
		mockContextMenuEvents.on("hide", hideSpy);

		const { result } = renderHook(() => useLadderContextMenu(section, ProjectMode.DESIGN));
		act(() => result.current.closeContextMenu());

		expect(hideSpy).toHaveBeenCalled();
	});
});
