/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ManualNav from "./ManualNav";

describe("ManualNav", () => {
	it("affiche les sections de premier niveau du plan (libellés traduits)", () => {
		renderWithI18n(<ManualNav />);
		expect(screen.getByText("Introduction")).toBeInTheDocument();
		expect(screen.getByText("Grafcet")).toBeInTheDocument();
		expect(screen.getByText("Interfaces HMI")).toBeInTheDocument();
		expect(screen.getByText("Raccourcis clavier")).toBeInTheDocument();
	});

	it("déplie une section au clic et expose ses sous-sections", () => {
		renderWithI18n(<ManualNav />);
		expect(screen.queryByText("Renvois")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("Grafcet"));
		expect(screen.getByText("Renvois")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Renvois" })).toHaveAttribute(
			"href",
			"#grafcet-referrals",
		);
	});

	it("déplie automatiquement le parent d'une sous-section sélectionnée", () => {
		renderWithI18n(<ManualNav selected="ladder-blocks" />);
		expect(screen.getByText("Blocs")).toBeInTheDocument();
	});

	it("notifie la sélection au clic", () => {
		const onSelect = jest.fn();
		renderWithI18n(<ManualNav onSelect={onSelect} />);
		fireEvent.click(screen.getByText("Variables"));
		expect(onSelect).toHaveBeenCalledWith("variables");
	});
});
