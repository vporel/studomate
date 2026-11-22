/** @jest-environment jsdom */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ShareProjectButton from "./ShareProjectButton";

jest.mock("./ProjectContext");

const shareProject = jest.fn();
const SHAREABLE_REPOSITORY = {
	getByShareToken: jest.fn(),
	getShareToken: jest.fn(),
	createShareToken: jest.fn(),
	deleteShareToken: jest.fn(),
};

function setup(
	{ shareable = true, isSharedProject = false } = {},
	props: Partial<Parameters<typeof ShareProjectButton>[0]> = {},
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			projectRepository: shareable ? SHAREABLE_REPOSITORY : {},
			isSharedProject,
			sharingManager: { shareProject },
		}),
	);
	return renderWithI18n(<ShareProjectButton source="title-bar" {...props} />);
}

describe("ShareProjectButton", () => {
	beforeEach(() => shareProject.mockClear());

	it("starts sharing with the given source", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Partager" }));

		expect(shareProject).toHaveBeenCalledTimes(1);
		expect(shareProject).toHaveBeenCalledWith("title-bar");
	});

	it("shows the label it is given instead of the default one", () => {
		setup({}, { source: "properties", label: "Partager le projet" });

		fireEvent.click(screen.getByRole("button", { name: "Partager le projet" }));

		expect(shareProject).toHaveBeenCalledWith("properties");
	});

	it("is in English with the English interface", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				projectRepository: SHAREABLE_REPOSITORY,
				isSharedProject: false,
				sharingManager: { shareProject },
			}),
		);
		renderWithI18n(<ShareProjectButton source="menu" />, { locale: "en" });

		expect(screen.getByRole("button", { name: "Share" })).toBeVisible();
	});

	it("renders nothing when the storage cannot share", () => {
		const { container } = setup({ shareable: false });

		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing on a project opened from a share link", () => {
		const { container } = setup({ isSharedProject: true });

		expect(container).toBeEmptyDOMElement();
	});
});
