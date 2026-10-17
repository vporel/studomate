/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { screen } from "@testing-library/react";
import TrainingPageFooter from "./TrainingPageFooter";

jest.mock("@/i18n/navigation", () => ({
	Link: ({ href, children, ...rest }: any) => (
		<a href={href} {...rest}>
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
});
