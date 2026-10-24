/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import Ladder from "@/schemas/ladder/ladder.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderPage from "./LadderPage";

jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("../ladder/context/LadderContext", () => ({
	LadderContextProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));
jest.mock("../ladder/toolbar/LadderToolbarDnDContext", () => ({
	LadderToolbarDnDProvider: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));
jest.mock("../ladder/toolbar/LadderToolbar", () => {
	return function LadderToolbarMock({
		systemBlocksPaletteOpen,
		onToggleSystemBlocksPalette,
	}: {
		systemBlocksPaletteOpen: boolean;
		onToggleSystemBlocksPalette: () => void;
	}) {
		return (
			<button onClick={onToggleSystemBlocksPalette}>
				toolbar {String(systemBlocksPaletteOpen)}
			</button>
		);
	};
});
jest.mock("../ladder/toolbar/SystemBlocksPalette", () => {
	return function SystemBlocksPaletteMock({
		position,
		onPositionChange,
		onClose,
	}: {
		position: { x: number; y: number } | null;
		onPositionChange: (position: { x: number; y: number }) => void;
		onClose: () => void;
	}) {
		return (
			<>
				<button onClick={onClose}>palette</button>
				<button onClick={() => onPositionChange({ x: 12, y: 34 })}>move</button>
				<span>{`position ${position ? `${position.x},${position.y}` : "none"}`}</span>
			</>
		);
	};
});
jest.mock("../ladder/flow/LadderFlow", () => {
	return function LadderFlowMock() {
		return <div>flow</div>;
	};
});
jest.mock("../ladder/system-blocks/TimerBlockDialog", () => () => null);
jest.mock("../ladder/system-blocks/CounterBlockDialog", () => () => null);

describe("LadderPage", () => {
	const ladder = new Ladder("ladder-1", "Test");

	it.each([true, false])(
		"shows the toolbar and the flow whether editing is enabled (%s) or not",
		(editingEnabled) => {
			(useProjectStore as jest.Mock).mockImplementation(
				selectorImplementation({
					activePageId: "ladder-1",
					editingEnabled,
				}),
			);

			render(<LadderPage initialLadder={ladder} />);

			expect(screen.getByText(/^toolbar/)).toBeInTheDocument();
			expect(screen.getByText("flow")).toBeInTheDocument();
		},
	);
	describe("boîte des blocs systèmes", () => {
		function mockProject(mode: ProjectMode) {
			(useProjectStore as jest.Mock).mockImplementation(
				selectorImplementation({
					activePageId: "ladder-1",
					editingEnabled: true,
					mode,
				}),
			);
		}
		function setup() {
			mockProject(ProjectMode.DESIGN);
			return render(<LadderPage initialLadder={ladder} />);
		}

		it("est fermée à l'ouverture de la page", () => {
			setup();
			expect(screen.queryByText("palette")).not.toBeInTheDocument();
			expect(screen.getByText("toolbar false")).toBeInTheDocument();
		});

		it("s'ouvre et se ferme par le bouton de la barre", () => {
			setup();

			fireEvent.click(screen.getByText("toolbar false"));
			expect(screen.getByText("palette")).toBeInTheDocument();
			expect(screen.getByText("toolbar true")).toBeInTheDocument();

			fireEvent.click(screen.getByText("toolbar true"));
			expect(screen.queryByText("palette")).not.toBeInTheDocument();
		});

		it("se ferme d'elle-même quand le projet cesse d'être modifiable, en simulation par exemple", () => {
			const { rerender } = setup();
			fireEvent.click(screen.getByText("toolbar false"));
			expect(screen.getByText("palette")).toBeInTheDocument();

			mockProject(ProjectMode.SIMULATION);
			rerender(<LadderPage initialLadder={ladder} />);

			expect(screen.queryByText("palette")).not.toBeInTheDocument();
		});

		it("s'ouvre sans position, puis retient celle où elle a été laissée", () => {
			setup();
			fireEvent.click(screen.getByText("toolbar false"));
			expect(screen.getByText("position none")).toBeInTheDocument();

			fireEvent.click(screen.getByText("move"));
			fireEvent.click(screen.getByText("palette"));
			fireEvent.click(screen.getByText("toolbar false"));

			expect(screen.getByText("position 12,34")).toBeInTheDocument();
		});

		it("garde la position même quand la boîte se ferme d'elle-même en simulation", () => {
			const { rerender } = setup();
			fireEvent.click(screen.getByText("toolbar false"));
			fireEvent.click(screen.getByText("move"));

			mockProject(ProjectMode.SIMULATION);
			rerender(<LadderPage initialLadder={ladder} />);
			mockProject(ProjectMode.DESIGN);
			rerender(<LadderPage initialLadder={ladder} />);
			fireEvent.click(screen.getByText("toolbar false"));

			expect(screen.getByText("position 12,34")).toBeInTheDocument();
		});

		it("se ferme par sa propre commande de fermeture", () => {
			setup();
			fireEvent.click(screen.getByText("toolbar false"));

			fireEvent.click(screen.getByText("palette"));

			expect(screen.queryByText("palette")).not.toBeInTheDocument();
		});
	});
});
