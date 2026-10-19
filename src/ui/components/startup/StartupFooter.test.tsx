/**
 * @jest-environment jsdom
 */
import routes from "@/app/routes";
import { openReportIssue } from "@/ui/services/report-issue";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import StartupFooter from "./StartupFooter";

jest.mock("@/ui/services/report-issue", () => ({
	openReportIssue: jest.fn(),
}));

describe("StartupFooter", () => {
	it("donne accès à la page À propos et aux pages légales", () => {
		renderWithI18n(<StartupFooter />);

		expect(screen.getByRole("link", { name: "À propos" })).toHaveAttribute(
			"href",
			routes.about(),
		);
		expect(
			screen.getByRole("link", { name: "Mentions légales" }),
		).toHaveAttribute("href", routes.legalMentions());
		expect(
			screen.getByRole("link", { name: "Conditions d'utilisation" }),
		).toHaveAttribute("href", routes.termsOfUse());
		expect(
			screen.getByRole("link", { name: "Politique de confidentialité" }),
		).toHaveAttribute("href", routes.privacyPolicy());
	});

	it("affiche le copyright de l'année en cours", () => {
		renderWithI18n(<StartupFooter />);

		expect(
			screen.getByText(`© ${new Date().getFullYear()} Studomate`),
		).toBeInTheDocument();
	});

	it("ouvre le signalement de problème au clic", () => {
		renderWithI18n(<StartupFooter />);

		fireEvent.click(screen.getByRole("button", { name: "Signaler un problème" }));

		expect(openReportIssue).toHaveBeenCalledTimes(1);
	});

	it("sépare chaque élément par un point médian masqué aux lecteurs d'écran", () => {
		const { container } = renderWithI18n(<StartupFooter />);

		const separators = container.querySelectorAll('[aria-hidden="true"]');
		expect(separators).toHaveLength(5);
		separators.forEach((separator) => expect(separator).toHaveTextContent("·"));
	});
});
