/**
 * @jest-environment jsdom
 */
import { renderHook } from "@testing-library/react";
import { i18nWrapper } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useSingleExportPageFrame from "./useSingleExportPageFrame";

jest.mock("@/ui/components/projects/ProjectContext");

function setup(project: { name: string; author?: string } | null) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ project }),
	);
	return renderHook(() => useSingleExportPageFrame(), {
		wrapper: i18nWrapper(),
	});
}

describe("useSingleExportPageFrame", () => {
	afterEach(() => jest.useRealTimers());

	it("puts the project in the header and the author followed by the export date in the footer", () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 10, 20));
		const { result } = setup({ name: "Elevator", author: "Alice" });

		expect(result.current()).toEqual({
			headerLeft: "Elevator",
			footerLeft: `Auteur : Alice \u2014 Exporté le ${new Date(2026, 10, 20).toLocaleDateString()}`,
			footerRight: "{page_number}/{pages_count}",
		});
	});

	it("shows only the export date, without dash, when there is no author", () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 10, 20));
		const { result } = setup({ name: "Elevator", author: "" });

		expect(result.current().footerLeft).toBe(
			`Exporté le ${new Date(2026, 10, 20).toLocaleDateString()}`,
		);
		expect(result.current().footerRight).toBe("{page_number}/{pages_count}");
	});

	it("reads the date when called, not when rendered", () => {
		jest.useFakeTimers().setSystemTime(new Date(2026, 10, 20));
		const { result } = setup({ name: "Elevator" });

		jest.setSystemTime(new Date(2026, 10, 21));

		expect(result.current().footerLeft).toBe(
			`Exporté le ${new Date(2026, 10, 21).toLocaleDateString()}`,
		);
	});
});
