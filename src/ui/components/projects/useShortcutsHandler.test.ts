/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import {
	useProjectContext,
	useProjectStore,
} from "@/ui/components/projects/ProjectContext";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import {
	createClipboardStore,
	type ClipboardEntry,
} from "@/ui/stores/shared/clipboard.store";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import { toast } from "react-toastify";
import useShortcutsHandler from "./useShortcutsHandler";

const clipboard = createClipboardStore();
const clearClipboard = () => clipboard.getState().clear();
const setClipboardEntry = (entry: ClipboardEntry) =>
	clipboard.getState().setEntry(entry);

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/lib/mouse-position");
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

function dispatchShortcut(
	key: string,
	opts: { shift?: boolean; target?: Element; repeat?: boolean } = {},
) {
	const { shift = false, target = document.body, repeat = false } = opts;
	const event = new KeyboardEvent("keydown", {
		key,
		ctrlKey: true,
		shiftKey: shift,
		repeat,
		bubbles: true,
		cancelable: true,
	});
	target.dispatchEvent(event);
	return event;
}

function dispatchKey(key: string, target: EventTarget = document.body) {
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
	);
}

describe("useShortcutsHandler", () => {
	const setOpenModalVisible = jest.fn();
	const saveProject = jest.fn();
	const setSaveAsModalVisible = jest.fn();
	const newGrafcet = jest.fn();
	const undoActiveScope = jest.fn();
	const redoActiveScope = jest.fn();
	const selectAllNodesAndEdges = jest.fn();
	const selectAllInActiveSection = jest.fn();
	const copySelectedElements = jest.fn();
	const pasteElements = jest.fn();
	const cutSelectedElements = jest.fn();

	const moveSelectedWidgets = jest.fn();

	function setup(
		mode: ProjectMode,
		activeScopeType: "grafcet" | "ladder" | "variables" | "hmi" = "grafcet",
	) {
		const hmiManager = {
			getActiveStoreManagers: jest.fn(() => ({
				moveSelectedWidgets,
				copyCutPasteManager: {
					copySelectedElements,
					pasteElements,
					cutSelectedElements,
				},
			})),
		};
		const grafcetsManager = {
			newGrafcet,
			getActiveStoreManagers: jest.fn(() => ({
				viewManager: { selectAllNodesAndEdges },
				copyCutPasteManager: {
					copySelectedElements,
					pasteElements,
					cutSelectedElements,
				},
			})),
		};
		const laddersManager = {
			newLadder: jest.fn(),
			getActiveStoreManagers: jest.fn(() => ({
				workflowManager: { selectAllInActiveSection },
				copyCutPasteManager: {
					copySelectedElements,
					pasteElements,
					cutSelectedElements,
				},
			})),
		};
		const state = {
			clipboard,
			mode,
			editingEnabled: true,
			activeScopeType,
			grafcetsManager,
			laddersManager,
			hmiManager,
			undoActiveScope,
			redoActiveScope,
		};
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcetsManager,
				laddersManager,
				hmiManager,
				setOpenModalVisible,
				lifecycleManager: { saveProject },
				setSaveAsModalVisible,
			}),
		);
		(useProjectContext as jest.Mock).mockReturnValue(fakeStoreApi(state));
		(getLastMousePosition as jest.Mock).mockReturnValue({ x: 1, y: 2 });
		return renderHook(() => useShortcutsHandler());
	}

	beforeEach(() => clearClipboard());
	afterEach(() => jest.clearAllMocks());

	it("opens the open-project modal on Ctrl+O while designing", () => {
		setup(ProjectMode.DESIGN);
		dispatchShortcut("o");
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);
	});

	it("ignores Ctrl+O outside design mode", () => {
		setup(ProjectMode.SIMULATION);
		dispatchShortcut("o");
		expect(setOpenModalVisible).not.toHaveBeenCalled();
	});

	it("saves the project on Ctrl+S regardless of mode", () => {
		setup(ProjectMode.SIMULATION);
		dispatchShortcut("s");
		expect(saveProject).toHaveBeenCalled();
		expect(setSaveAsModalVisible).not.toHaveBeenCalled();
	});

	it("ignores the auto-repeat of Ctrl+S but still blocks the browser's own dialog", () => {
		setup(ProjectMode.DESIGN);
		const event = dispatchShortcut("s", { repeat: true });
		expect(saveProject).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);
	});

	it("ignores the auto-repeat of Ctrl+Shift+S", () => {
		setup(ProjectMode.DESIGN);
		const event = dispatchShortcut("s", { shift: true, repeat: true });
		expect(setSaveAsModalVisible).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(true);
	});

	it("opens the save-as modal on Ctrl+Shift+S regardless of mode", () => {
		setup(ProjectMode.DESIGN);
		dispatchShortcut("s", { shift: true });
		expect(setSaveAsModalVisible).toHaveBeenCalledWith(true);
		expect(saveProject).not.toHaveBeenCalled();
	});

	it("opens the save-as modal on Ctrl+Shift+S even in simulation mode", () => {
		setup(ProjectMode.SIMULATION);
		dispatchShortcut("s", { shift: true });
		expect(setSaveAsModalVisible).toHaveBeenCalledWith(true);
	});

	it("creates a new grafcet on Ctrl+G while designing", () => {
		setup(ProjectMode.DESIGN);
		dispatchShortcut("g");
		expect(newGrafcet).toHaveBeenCalled();
	});

	it("selects all nodes on Ctrl+A while designing a grafcet", () => {
		setup(ProjectMode.DESIGN, "grafcet");
		dispatchShortcut("a");
		expect(selectAllNodesAndEdges).toHaveBeenCalled();
	});

	it("does not select nodes on Ctrl+A outside a grafcet or ladder scope", () => {
		setup(ProjectMode.DESIGN, "variables");
		dispatchShortcut("a");
		expect(selectAllNodesAndEdges).not.toHaveBeenCalled();
		expect(selectAllInActiveSection).not.toHaveBeenCalled();
	});

	it("selects all in the active section on Ctrl+A while designing a ladder", () => {
		setup(ProjectMode.DESIGN, "ladder");
		dispatchShortcut("a");
		expect(selectAllInActiveSection).toHaveBeenCalled();
	});

	it("undoes and redoes regardless of mode", () => {
		setup(ProjectMode.SIMULATION);
		dispatchShortcut("z");
		dispatchShortcut("y");
		expect(undoActiveScope).toHaveBeenCalled();
		expect(redoActiveScope).toHaveBeenCalled();
	});

	it("copies and pastes selected elements while designing a grafcet", () => {
		setup(ProjectMode.DESIGN, "grafcet");
		dispatchShortcut("c");
		dispatchShortcut("v");
		expect(copySelectedElements).toHaveBeenCalled();
		expect(pasteElements).toHaveBeenCalledWith({ x: 1, y: 2 });
	});

	it("copies and pastes selected elements while designing a ladder", () => {
		setup(ProjectMode.DESIGN, "ladder");
		dispatchShortcut("c");
		dispatchShortcut("v");
		expect(copySelectedElements).toHaveBeenCalled();
		expect(pasteElements).toHaveBeenCalledWith({ x: 1, y: 2 });
	});

	it("shows a toast and does not paste when the clipboard holds another page type", () => {
		setup(ProjectMode.DESIGN, "grafcet");
		setClipboardEntry({ scope: "ladder", data: {} });

		dispatchShortcut("v");

		expect(pasteElements).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalled();
	});

	it("cuts selected elements on Ctrl+X for a grafcet", () => {
		setup(ProjectMode.DESIGN, "grafcet");
		dispatchShortcut("x");
		expect(cutSelectedElements).toHaveBeenCalled();
	});

	it("cuts selected elements on Ctrl+X for a ladder", () => {
		setup(ProjectMode.DESIGN, "ladder");
		dispatchShortcut("x");
		expect(cutSelectedElements).toHaveBeenCalled();
	});

	it.each(["grafcet", "ladder"] as const)(
		"ignores Ctrl+V and Ctrl+X in simulation for a %s",
		(scope) => {
			setup(ProjectMode.SIMULATION, scope);
			dispatchShortcut("v");
			dispatchShortcut("x");
			expect(pasteElements).not.toHaveBeenCalled();
			expect(cutSelectedElements).not.toHaveBeenCalled();
		},
	);

	it("does not show the wrong-scope toast in simulation for a grafcet", () => {
		setup(ProjectMode.SIMULATION, "grafcet");
		setClipboardEntry({ scope: "ladder", data: {} });
		dispatchShortcut("v");
		expect(toast.error).not.toHaveBeenCalled();
	});

	it("still copies in simulation", () => {
		setup(ProjectMode.SIMULATION, "grafcet");
		dispatchShortcut("c");
		expect(copySelectedElements).toHaveBeenCalled();
	});

	it("still pastes and cuts in simulation for the HMI", () => {
		setup(ProjectMode.SIMULATION, "hmi");
		dispatchShortcut("v");
		dispatchShortcut("x");
		expect(pasteElements).toHaveBeenCalled();
		expect(cutSelectedElements).toHaveBeenCalled();
	});

	it("moves selected HMI widgets by one grid step on arrow keys while designing", () => {
		setup(ProjectMode.DESIGN, "hmi");
		dispatchKey("ArrowRight");
		expect(moveSelectedWidgets).toHaveBeenCalledWith(10, 0);
		dispatchKey("ArrowUp");
		expect(moveSelectedWidgets).toHaveBeenCalledWith(0, -10);
	});

	it("ignores arrow keys for HMI outside design mode", () => {
		setup(ProjectMode.SIMULATION, "hmi");
		dispatchKey("ArrowRight");
		expect(moveSelectedWidgets).not.toHaveBeenCalled();
	});

	it("ignores arrow keys when the active scope is not HMI", () => {
		setup(ProjectMode.DESIGN, "grafcet");
		dispatchKey("ArrowRight");
		expect(moveSelectedWidgets).not.toHaveBeenCalled();
	});

	it("ignores arrow keys typed inside an input", () => {
		setup(ProjectMode.DESIGN, "hmi");
		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchKey("ArrowRight", input);
		expect(moveSelectedWidgets).not.toHaveBeenCalled();
		document.body.removeChild(input);
	});

	const editableDiv = () => {
		const div = document.createElement("div");
		Object.defineProperty(div, "isContentEditable", { value: true });
		return div;
	};

	it("ignores shortcuts typed inside editable content", () => {
		setup(ProjectMode.DESIGN);
		const div = editableDiv();
		document.body.appendChild(div);
		dispatchShortcut("g", { target: div });
		expect(newGrafcet).not.toHaveBeenCalled();
		document.body.removeChild(div);
	});

	it("ignores shortcuts typed inside an input", () => {
		setup(ProjectMode.DESIGN);
		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchShortcut("g", { target: input });
		expect(newGrafcet).not.toHaveBeenCalled();
		document.body.removeChild(input);
	});

	describe("Ctrl+S in a text field", () => {
		beforeEach(() => jest.useFakeTimers());
		afterEach(() => jest.useRealTimers());

		const fields: [string, () => HTMLElement][] = [
			["an input", () => document.createElement("input")],
			["a textarea", () => document.createElement("textarea")],
			["editable content", () => editableDiv()],
		];

		it.each(fields)(
			"in %s: blocks the browser, leaves the field then saves on the next tick",
			(_name, create) => {
				setup(ProjectMode.DESIGN);
				const field = create();
				field.tabIndex = 0;
				document.body.appendChild(field);
				field.focus();
				const blur = jest.spyOn(field, "blur");

				const event = dispatchShortcut("s", { target: field });

				expect(event.defaultPrevented).toBe(true);
				expect(blur).toHaveBeenCalledTimes(1);
				expect(saveProject).not.toHaveBeenCalled();
				jest.runAllTimers();
				expect(saveProject).toHaveBeenCalledTimes(1);
				document.body.removeChild(field);
			},
		);

		it("saves what the blur just committed", () => {
			setup(ProjectMode.DESIGN);
			const input = document.createElement("input");
			document.body.appendChild(input);
			input.focus();
			const order: string[] = [];
			input.addEventListener("blur", () => order.push("blur"));
			saveProject.mockImplementation(() => order.push("save"));

			dispatchShortcut("s", { target: input });
			jest.runAllTimers();

			expect(order).toEqual(["blur", "save"]);
			document.body.removeChild(input);
		});

		it("Ctrl+Shift+S opens the save-as modal after leaving the field", () => {
			setup(ProjectMode.DESIGN);
			const input = document.createElement("input");
			document.body.appendChild(input);
			const blur = jest.spyOn(input, "blur");

			const event = dispatchShortcut("s", { shift: true, target: input });

			expect(event.defaultPrevented).toBe(true);
			expect(blur).toHaveBeenCalled();
			expect(setSaveAsModalVisible).toHaveBeenCalledWith(true);
			expect(saveProject).not.toHaveBeenCalled();
			document.body.removeChild(input);
		});

		it("ignores the auto-repeat but still blocks the browser", () => {
			setup(ProjectMode.DESIGN);
			const input = document.createElement("input");
			document.body.appendChild(input);
			const blur = jest.spyOn(input, "blur");

			const event = dispatchShortcut("s", { target: input, repeat: true });
			jest.runAllTimers();

			expect(event.defaultPrevented).toBe(true);
			expect(blur).not.toHaveBeenCalled();
			expect(saveProject).not.toHaveBeenCalled();
			document.body.removeChild(input);
		});

		it("keeps the native behaviour inside a dialog", () => {
			setup(ProjectMode.DESIGN);
			const dialog = document.createElement("div");
			dialog.setAttribute("role", "dialog");
			const input = document.createElement("input");
			dialog.appendChild(input);
			document.body.appendChild(dialog);

			const event = dispatchShortcut("s", { target: input });
			const shifted = dispatchShortcut("s", { shift: true, target: input });
			jest.runAllTimers();

			expect(event.defaultPrevented).toBe(false);
			expect(shifted.defaultPrevented).toBe(false);
			expect(saveProject).not.toHaveBeenCalled();
			expect(setSaveAsModalVisible).not.toHaveBeenCalled();
			document.body.removeChild(dialog);
		});

		it("still intercepts Ctrl+S from a non-field element of a dialog", () => {
			setup(ProjectMode.DESIGN);
			const dialog = document.createElement("div");
			dialog.setAttribute("role", "dialog");
			const button = document.createElement("button");
			dialog.appendChild(button);
			document.body.appendChild(dialog);

			const event = dispatchShortcut("s", { target: button });

			expect(event.defaultPrevented).toBe(true);
			expect(saveProject).toHaveBeenCalledTimes(1);
			document.body.removeChild(dialog);
		});
	});
});
