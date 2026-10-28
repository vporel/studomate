/**
 * @jest-environment jsdom
 */
import routes from "@/app/routes";
import { screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import StartupHeader from "./StartupHeader";

jest.mock("@/ui/components/auth/AccountStatus", () => ({
	__esModule: true,
	default: () => <div data-testid="account-status" />,
}));

describe("StartupHeader", () => {
	it("renvoie vers l'accueil du site et affiche le compte", () => {
		renderWithI18n(<StartupHeader />);

		const banner = screen.getByRole("banner");
		expect(
			within(banner).getByRole("link", { name: "Studomate : accueil" }),
		).toHaveAttribute("href", routes.home());
		expect(within(banner).getByTestId("account-status")).toBeInTheDocument();
	});
});
