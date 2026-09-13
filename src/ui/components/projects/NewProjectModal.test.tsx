/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { screen } from "@testing-library/react";
import { getMessages } from "@/i18n/messages";
import { PROJECT_TEMPLATES } from "@/templates/index";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import NewProjectModal from "./NewProjectModal";

const templateLabels = (getMessages("fr").templates ?? {}) as Record<
	string,
	{ label: string }
>;

jest.mock("./ProjectContext");

function setup() {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { newProjectModalVisible: true },
			setNewProjectModalVisible: jest.fn(),
			lifecycleManager: { newProjectFromTemplate: jest.fn() },
		}),
	);

	renderWithI18n(<NewProjectModal />);
}

describe("NewProjectModal", () => {
	it("n'affiche pas les templates marqués hiddenFromCatalog", () => {
		setup();

		const hidden = PROJECT_TEMPLATES.filter((t) => t.hiddenFromCatalog);
		expect(hidden.length).toBeGreaterThan(0);
		for (const template of hidden) {
			expect(
				screen.queryByText(templateLabels[template.id].label),
			).not.toBeInTheDocument();
		}
	});

	it("affiche les templates du catalogue visible", () => {
		setup();

		const visible = PROJECT_TEMPLATES.filter((t) => !t.hiddenFromCatalog);
		expect(visible.length).toBeGreaterThan(0);
		for (const template of visible) {
			expect(
				screen.getByText(templateLabels[template.id].label),
			).toBeInTheDocument();
		}
	});
});
