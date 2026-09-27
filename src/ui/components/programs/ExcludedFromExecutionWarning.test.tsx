/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ExcludedFromExecutionWarning from "./ExcludedFromExecutionWarning";

const LABEL = "Exclu de l'exécution";

describe("ExcludedFromExecutionWarning", () => {
	it("opens the explanation dialog on click", () => {
		renderWithI18n(<ExcludedFromExecutionWarning onInclude={jest.fn()} />);

		expect(screen.queryByText("Programme non exécuté")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText(LABEL));

		expect(screen.getByText("Programme non exécuté")).toBeInTheDocument();
	});

	it("calls onInclude from the dialog", () => {
		const onInclude = jest.fn();
		renderWithI18n(<ExcludedFromExecutionWarning onInclude={onInclude} />);

		fireEvent.click(screen.getByText(LABEL));
		fireEvent.click(screen.getByText("Inclure dans l'exécution"));

		expect(onInclude).toHaveBeenCalledTimes(1);
	});

	it("disables the include button when requested", () => {
		renderWithI18n(
			<ExcludedFromExecutionWarning onInclude={jest.fn()} includeDisabled />,
		);

		fireEvent.click(screen.getByText(LABEL));

		expect(
			screen.getByText("Inclure dans l'exécution").closest("button"),
		).toBeDisabled();
	});
});
