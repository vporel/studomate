/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import AnalyserToolbarItem from "./AnalyserToolbarItem";

const ENABLE_HINT = /Pour le réactiver, arrêtez la simulation/;

function setup({
	excluded = false,
	simulating = false,
	toggleAvailable = true,
	disabled = false,
} = {}) {
	const onToggle = jest.fn();
	const { container } = renderWithI18n(
		<AnalyserToolbarItem
			excluded={excluded}
			simulating={simulating}
			toggleAvailable={toggleAvailable}
			disabled={disabled}
			onToggle={onToggle}
		/>,
	);
	return { onToggle, container };
}

describe("AnalyserToolbarItem", () => {
	describe("when the toggle is available, in design mode", () => {
		it("disables the analyser of an analysed program", () => {
			const { onToggle } = setup();

			fireEvent.click(screen.getByText("Désactiver l'analyseur"));

			expect(onToggle).toHaveBeenCalledWith(true);
		});

		it("enables the analyser of an excluded program", () => {
			const { onToggle } = setup({ excluded: true });

			fireEvent.click(screen.getByText("Activer l'analyseur"));

			expect(onToggle).toHaveBeenCalledWith(false);
		});

		it("can be disabled", () => {
			setup({ disabled: true });

			expect(
				screen.getByText("Désactiver l'analyseur").closest("button"),
			).toBeDisabled();
		});
	});

	describe.each([
		["during a simulation", { simulating: true, toggleAvailable: true }],
		["without the toggle, in design mode", { toggleAvailable: false }],
		[
			"without the toggle, during a simulation",
			{ simulating: true, toggleAvailable: false },
		],
	])("%s", (_, context) => {
		it("only warns that an excluded program is not executed", () => {
			setup({ ...context, excluded: true });

			expect(screen.getByText("Non exécuté")).toBeInTheDocument();
			expect(screen.queryByText("Activer l'analyseur")).not.toBeInTheDocument();
		});

		it("explains on click why the program is not executed, without toggling it", () => {
			const { onToggle } = setup({ ...context, excluded: true });

			fireEvent.click(screen.getByText("Non exécuté"));

			expect(screen.getByText("Programme non exécuté")).toBeInTheDocument();
			expect(
				screen.getByText(/L'analyseur de ce programme a été désactivé/),
			).toBeInTheDocument();
			expect(onToggle).not.toHaveBeenCalled();
		});

		it("shows nothing for an analysed program", () => {
			const { container } = setup(context);

			expect(container).toBeEmptyDOMElement();
		});
	});

	it("tells how to enable the analyser again when the toggle is available", () => {
		setup({ excluded: true, simulating: true, toggleAvailable: true });

		fireEvent.click(screen.getByText("Non exécuté"));

		expect(screen.getByText(ENABLE_HINT)).toBeInTheDocument();
	});

	it("does not tell how to enable the analyser again without the toggle", () => {
		setup({ excluded: true, toggleAvailable: false });

		fireEvent.click(screen.getByText("Non exécuté"));

		expect(screen.queryByText(ENABLE_HINT)).not.toBeInTheDocument();
	});
});
