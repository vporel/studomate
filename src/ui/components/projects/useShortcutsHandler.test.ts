/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import {
	useProjectContext,
	useProjectStore,
} from "@/ui/components/projects/ProjectContext";
import { getLastMousePosition } from "@/ui/lib/mouse-position";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import {
	clearClipboard,
	setClipboardEntry,
} from "@/ui/stores/shared/clipboard.store";
import { fakeStoreApi, selectorImplementation } from "@tests/utils/store-mocks";
import { toast } from "react-toastify";
import useShortcutsHandler from "./useShortcutsHandler";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/lib/mouse-position");
jest.mock("react-toastify", () => ({ toast: { error: jest.fn() } }));

function dispatchShortcut(
	key: string,
	opts: { shift?: boolean; target?: Element } = {},
) {
	const { shift = false, target = document.body } = opts;
	const event = new KeyboardEvent("keydown", {
		key,
		ctrlKey: true,
		shiftKey: shift,
		bubbles: true,
		cancelable: true,
	});
	target.dispatchEvent(event);
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

	function setup(
		mode: ProjectMode,
		activeScopeType: "grafcet" | "ladder" | "variables" = "grafcet",
	) {
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
			mode,
			activeScopeType,
			grafcetsManager,
			laddersManager,
			undoActiveScope,
			redoActiveScope,
		};
		(useProjectStore as jest.Mock).mockImplementation(
			selectorImplementation({
				grafcetsManager,
				laddersManager,
				setOpenModalVisible,
				saveProject,
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

	it("ignores shortcuts typed inside an input", () => {
		setup(ProjectMode.DESIGN);
		const input = document.createElement("input");
		document.body.appendChild(input);
		dispatchShortcut("s", { target: input });
		expect(saveProject).not.toHaveBeenCalled();
		document.body.removeChild(input);
	});
});
