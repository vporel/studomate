import { ProjectStoreState } from "./project.store";
import { ProjectMode } from "./ProjectMode.enum";
import {
	canRedoActiveScope,
	canUndoActiveScope,
	performRedo,
	performUndo,
} from "./undo-redo";

/**
 * Ces tests tournent sans store zustand ni React : les helpers prennent l'état en argument.
 */
function makeState(overrides: {
	mode?: ProjectMode;
	activeScopeType?: "project" | "grafcet";
	hasCommandsToUndo?: boolean;
	hasCommandsToRedo?: boolean;
	grafcetUndo?: boolean;
	grafcetRedo?: boolean;
	grafcetManagerMissing?: boolean;
}) {
	const projectStack = { undoOperation: jest.fn(), redoOperation: jest.fn() };
	const grafcetStack = { undoOperation: jest.fn(), redoOperation: jest.fn() };
	const state = {
		mode: overrides.mode ?? ProjectMode.DESIGN,
		activeScopeType: overrides.activeScopeType ?? "project",
		hasCommandsToUndo: overrides.hasCommandsToUndo ?? false,
		hasCommandsToRedo: overrides.hasCommandsToRedo ?? false,
		commandsStackManager: projectStack,
		grafcetsManager: {
			getActiveStoreValues: () => ({
				hasCommandsToUndo: overrides.grafcetUndo ?? false,
				hasCommandsToRedo: overrides.grafcetRedo ?? false,
			}),
			getActiveStoreManagers: () =>
				overrides.grafcetManagerMissing
					? null
					: { commandsStackManager: grafcetStack },
		},
	} as unknown as ProjectStoreState;
	return { state, projectStack, grafcetStack };
}

describe("undo-redo — arbitrage de portée", () => {
	describe("portée projet", () => {
		it("autorise l'annulation quand le projet a de quoi annuler", () => {
			const { state } = makeState({
				activeScopeType: "project",
				hasCommandsToUndo: true,
			});
			expect(canUndoActiveScope(state)).toBe(true);
		});

		it("délègue à la pile projet", () => {
			const { state, projectStack, grafcetStack } = makeState({
				activeScopeType: "project",
				hasCommandsToUndo: true,
			});

			performUndo(state);

			expect(projectStack.undoOperation).toHaveBeenCalled();
			expect(grafcetStack.undoOperation).not.toHaveBeenCalled();
		});

		it("ignore l'historique du grafcet actif", () => {
			const { state } = makeState({
				activeScopeType: "project",
				hasCommandsToUndo: false,
				grafcetUndo: true,
			});
			expect(canUndoActiveScope(state)).toBe(false);
		});
	});

	describe("portée grafcet", () => {
		it("délègue à la pile du grafcet actif", () => {
			const { state, projectStack, grafcetStack } = makeState({
				activeScopeType: "grafcet",
				grafcetUndo: true,
			});

			performUndo(state);

			expect(grafcetStack.undoOperation).toHaveBeenCalled();
			expect(projectStack.undoOperation).not.toHaveBeenCalled();
		});

		it("ignore l'historique du projet", () => {
			const { state } = makeState({
				activeScopeType: "grafcet",
				hasCommandsToUndo: true,
				grafcetUndo: false,
			});
			expect(canUndoActiveScope(state)).toBe(false);
		});

		it("ne fait rien si aucun grafcet n'est monté", () => {
			const { state, projectStack } = makeState({
				activeScopeType: "grafcet",
				grafcetUndo: true,
				grafcetManagerMissing: true,
			});

			expect(() => performUndo(state)).not.toThrow();
			expect(projectStack.undoOperation).not.toHaveBeenCalled();
		});
	});

	describe("mode simulation", () => {
		it("interdit annuler et rétablir hors du mode conception", () => {
			const { state } = makeState({
				mode: ProjectMode.SIMULATION,
				hasCommandsToUndo: true,
				hasCommandsToRedo: true,
			});

			expect(canUndoActiveScope(state)).toBe(false);
			expect(canRedoActiveScope(state)).toBe(false);
		});

		it("n'exécute rien même si on force l'appel", () => {
			const { state, projectStack } = makeState({
				mode: ProjectMode.SIMULATION,
				hasCommandsToUndo: true,
			});

			performUndo(state);

			expect(projectStack.undoOperation).not.toHaveBeenCalled();
		});
	});

	describe("rétablir", () => {
		it("suit la même règle de portée que l'annulation", () => {
			const { state, grafcetStack } = makeState({
				activeScopeType: "grafcet",
				grafcetRedo: true,
			});

			expect(canRedoActiveScope(state)).toBe(true);
			performRedo(state);
			expect(grafcetStack.redoOperation).toHaveBeenCalled();
		});
	});
});
