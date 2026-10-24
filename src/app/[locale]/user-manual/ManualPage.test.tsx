/**
 * @jest-environment jsdom
 */
import { screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import fr from "@/i18n/messages/fr/manual.json";
import ManualPage from "./ManualPage";

jest.mock("next/navigation", () => ({
	useRouter: () => ({ push: jest.fn() }),
}));

describe("ManualPage", () => {
	it("keeps the manual title as the h1 on the default section", () => {
		renderWithI18n(<ManualPage section="intro" />);

		expect(
			screen.getByRole("heading", { level: 1, name: fr.pageTitle }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", { level: 2, name: fr.intro.title }),
		).toBeInTheDocument();
	});

	it("makes the section title the only h1 on another section", () => {
		renderWithI18n(<ManualPage section="limits" />);

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(
			screen.getByRole("heading", { level: 1, name: fr.limits.title }),
		).toBeInTheDocument();
		expect(screen.getByText(fr.pageTitle).tagName).toBe("P");
		expect(
			screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
		).toEqual(fr.limits.groups.map((g) => g.title));
	});

	it("renders the breadcrumb before the title", () => {
		renderWithI18n(
			<ManualPage section="limits" breadcrumb={<nav>fil</nav>} />,
		);

		const nav = screen.getByText("fil");
		const title = screen.getByRole("heading", { level: 1 });
		expect(
			nav.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shifts the sub-sections of a section with children by one level", () => {
		renderWithI18n(<ManualPage section="grafcet" />);

		expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
		expect(screen.queryAllByRole("heading", { level: 5 })).toHaveLength(0);
		expect(screen.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0);
	});
});
