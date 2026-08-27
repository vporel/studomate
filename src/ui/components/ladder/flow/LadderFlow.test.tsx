/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import Section from "@/schemas/ladder/section.schema";
import SectionReorderCommand from "@/schemas/ladder/commands/section-reorder.command";
import { useLadderStore } from "../context/LadderContext";
import { selectorImplementation } from "@tests/utils/store-mocks";
import LadderFlow from "./LadderFlow";

jest.mock("../context/LadderContext");
jest.mock("./LadderSection", () => ({
	__esModule: true,
	default: ({ section, index }: { section: Section; index: number }) => (
		<div data-testid="ladder-section">
			{index}:{section.id}
		</div>
	),
}));

// Simuler un vrai geste de glisser-déposer dnd-kit (capteurs pointeur) en jsdom est fragile et
// hors de proportion ici : on intercepte `onDragEnd` directement, comme dnd-kit l'appellerait.
let capturedOnDragEnd: ((event: any) => void) | null = null;
jest.mock("@dnd-kit/core", () => {
	const actual = jest.requireActual("@dnd-kit/core");
	return {
		...actual,
		DndContext: (props: any) => {
			capturedOnDragEnd = props.onDragEnd;
			return props.children;
		},
	};
});

describe("LadderFlow", () => {
	it("rend une LadderSection par section du ladder, dans l'ordre", () => {
		const sections = [new Section("s1", "A", ""), new Section("s2", "B", "")];
		(useLadderStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				ladder: { sections },
				commandsStackManager: { executeOperation: jest.fn() },
			}),
		);

		render(<LadderFlow />);

		const rendered = screen
			.getAllByTestId("ladder-section")
			.map((el) => el.textContent);
		expect(rendered).toEqual(["0:s1", "1:s2"]);
	});

	it("ne rend rien pour un ladder sans section", () => {
		(useLadderStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				ladder: { sections: [] },
				commandsStackManager: { executeOperation: jest.fn() },
			}),
		);

		render(<LadderFlow />);

		expect(screen.queryByTestId("ladder-section")).not.toBeInTheDocument();
	});

	it("dispatche SectionReorderCommand avec le nouvel ordre au dépôt", () => {
		const sections = [
			new Section("s1", "A", ""),
			new Section("s2", "B", ""),
			new Section("s3", "C", ""),
		];
		const executeOperation = jest.fn();
		(useLadderStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				ladder: { sections },
				commandsStackManager: { executeOperation },
			}),
		);
		render(<LadderFlow />);

		capturedOnDragEnd!({ active: { id: "s1" }, over: { id: "s3" } });

		expect(executeOperation).toHaveBeenCalledTimes(1);
		const [commands] = executeOperation.mock.calls[0];
		expect(commands[0]).toBeInstanceOf(SectionReorderCommand);
		expect(commands[0].payload).toEqual({
			orderedSectionIds: ["s2", "s3", "s1"],
			previousOrderedSectionIds: ["s1", "s2", "s3"],
		});
	});

	it("ne dispatche rien si la section est déposée sur elle-même ou hors cible", () => {
		const sections = [new Section("s1", "A", "")];
		const executeOperation = jest.fn();
		(useLadderStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				ladder: { sections },
				commandsStackManager: { executeOperation },
			}),
		);
		render(<LadderFlow />);

		capturedOnDragEnd!({ active: { id: "s1" }, over: { id: "s1" } });
		capturedOnDragEnd!({ active: { id: "s1" }, over: null });

		expect(executeOperation).not.toHaveBeenCalled();
	});
});
