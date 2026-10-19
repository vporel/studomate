/**
 * @jest-environment jsdom
 */
import routes from "@/app/routes";
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import StartupAside from "./StartupAside";

describe("StartupAside", () => {
	it("donne accès au manuel et aux formations", () => {
		renderWithI18n(<StartupAside />);
		expect(
			screen.getByRole("link", { name: "Manuel utilisateur" }),
		).toHaveAttribute("href", routes.userManual());
		expect(screen.getByRole("link", { name: "Formations" })).toHaveAttribute(
			"href",
			routes.training(),
		);
	});
});
