/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import TrainingExerciseBlock from "./TrainingExerciseBlock";

const mockUnmounted = jest.fn();

jest.mock("./TrainingEmbeddedBlock", () => ({
	__esModule: true,
	default: function EmbeddedBlock({
		variant = "solution",
		watchOpen,
		tools,
	}: {
		variant?: string;
		watchOpen?: boolean;
		tools?: unknown;
	}) {
		useEffect(() => () => mockUnmounted(variant), [variant]);
		return (
			<div
				data-testid={variant}
				data-watch-open={String(watchOpen)}
				data-tools={JSON.stringify(tools ?? null)}
			/>
		);
	},
}));

function setup(watchOpen?: boolean) {
	return render(
		<TrainingExerciseBlock
			templateId="linear-sequence"
			locale="fr"
			exerciseTab="Exercice"
			solutionTab="Corrigé"
			watchOpen={watchOpen}
		/>,
	);
}

describe("TrainingExerciseBlock", () => {
	beforeEach(() => mockUnmounted.mockClear());

	it("shows the exercise alone, without tabs, when there is no solution tab", () => {
		render(<TrainingExerciseBlock templateId="ladder-and-or" locale="fr" />);
		expect(screen.getByTestId("exercise")).toBeVisible();
		expect(screen.queryByRole("tab")).not.toBeInTheDocument();
	});

	it("shows the exercise first, without loading the solution", () => {
		setup();
		expect(screen.getByTestId("exercise")).toBeVisible();
		expect(screen.queryByTestId("solution")).not.toBeInTheDocument();
	});

	it("shows the solution in its tab and hides the exercise without unmounting it", () => {
		setup();

		fireEvent.click(screen.getByRole("tab", { name: "Corrigé" }));

		expect(screen.getByTestId("solution")).toBeVisible();
		expect(screen.getByTestId("exercise")).not.toBeVisible();
		expect(mockUnmounted).not.toHaveBeenCalled();
	});

	it("tells the solution to open its watch table when asked", () => {
		setup(true);

		fireEvent.click(screen.getByRole("tab", { name: "Corrigé" }));

		expect(screen.getByTestId("solution")).toHaveAttribute(
			"data-watch-open",
			"true",
		);
	});

	it("hands its tools to the exercise only", () => {
		const tools = { ladder: ["contact-NO" as const] };
		render(
			<TrainingExerciseBlock
				templateId="linear-sequence"
				locale="fr"
				exerciseTab="Exercice"
				solutionTab="Corrigé"
				tools={tools}
			/>,
		);

		fireEvent.click(screen.getByRole("tab", { name: "Corrigé" }));

		expect(screen.getByTestId("exercise")).toHaveAttribute(
			"data-tools",
			JSON.stringify(tools),
		);
		expect(screen.getByTestId("solution")).toHaveAttribute(
			"data-tools",
			"null",
		);
	});

	it("hands its tools to the exercise shown alone", () => {
		const tools = { ladder: ["contact-NO" as const] };
		render(
			<TrainingExerciseBlock
				templateId="ladder-and-or"
				locale="fr"
				tools={tools}
			/>,
		);

		expect(screen.getByTestId("exercise")).toHaveAttribute(
			"data-tools",
			JSON.stringify(tools),
		);
	});

	it("brings the same exercise back from the solution tab", () => {
		setup();
		const exercise = screen.getByTestId("exercise");

		fireEvent.click(screen.getByRole("tab", { name: "Corrigé" }));
		fireEvent.click(screen.getByRole("tab", { name: "Exercice" }));

		expect(screen.getByTestId("exercise")).toBe(exercise);
		expect(exercise).toBeVisible();
		expect(screen.getByTestId("solution")).not.toBeVisible();
	});
});
