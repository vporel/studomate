/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { screen } from "@testing-library/react";
import TrainingPageFooter from "./TrainingPageFooter";

jest.mock("@/i18n/navigation", () => ({
	Link: ({ href, children, ...rest }: any) => (
		<a href={typeof href === "string" ? href : JSON.stringify(href)} {...rest}>
			{children}
		</a>
	),
}));

describe("TrainingPageFooter", () => {
	it("propose le retour aux formations et à l'accueil", () => {
		renderWithI18n(<TrainingPageFooter />);

		expect(
			screen.getByRole("link", { name: "Retour aux formations" }),
		).toHaveAttribute("href", "/training");
		expect(
			screen.getByRole("link", { name: "Retour à l'accueil" }),
		).toHaveAttribute("href", "/");
	});

	it("n'ajoute aucun lien vers le manuel par défaut", () => {
		renderWithI18n(<TrainingPageFooter />);

		expect(screen.getAllByRole("link")).toHaveLength(2);
	});

	it("lie le manuel des éditeurs du module, avec le slug de la langue", () => {
		renderWithI18n(
			<TrainingPageFooter manualSections={["grafcet", "ladder"]} />,
		);

		expect(
			screen.getByRole("link", { name: "Manuel de l'éditeur GRAFCET" }),
		).toHaveAttribute(
			"href",
			JSON.stringify({
				pathname: "/user-manual/[section]",
				params: { section: "grafcet" },
			}),
		);
		expect(
			screen.getByRole("link", { name: "Manuel de l'éditeur Ladder" }),
		).toBeInTheDocument();
	});
});
