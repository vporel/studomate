/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import CloudAccountModal from "./CloudAccountModal";
import { useProjectContext } from "@/ui/components/projects/ProjectContext";

const mockListCloud = jest.fn();
const mockSignOut = jest.fn();

jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) => selector({ signOut: mockSignOut }),
}));

jest.mock("@/persistence/repositories/hybrid.project.repository", () => ({
	__esModule: true,
	default: class {
		listCloud = (...args: any[]) => mockListCloud(...args);
	},
}));

jest.mock("@/ui/components/projects/ProjectContext");

jest.mock("./DeleteAccountModal", () => ({
	__esModule: true,
	default: ({ open, cloudProjectCount }: any) =>
		open ? <div>delete-modal:{cloudProjectCount}</div> : null,
}));

function setup({ withProjectStore = true, onClose = jest.fn() } = {}) {
	const setOpenModalVisible = jest.fn();
	(useProjectContext as jest.Mock).mockReturnValue(
		withProjectStore ? { getState: () => ({ setOpenModalVisible }) } : null,
	);
	renderWithI18n(<CloudAccountModal open onClose={onClose} />);
	return { onClose, setOpenModalVisible };
}

describe("CloudAccountModal", () => {
	beforeEach(() => {
		mockListCloud.mockResolvedValue({
			projects: [{ id: "a" }, { id: "b" }],
			skipped: [],
		});
	});
	afterEach(() => jest.clearAllMocks());

	it("shows the number of cloud projects", async () => {
		setup();

		expect(await screen.findByText("2 projets dans le cloud")).toBeTruthy();
	});

	it("uses the singular for a single project", async () => {
		mockListCloud.mockResolvedValue({ projects: [{ id: "a" }], skipped: [] });
		setup();

		expect(await screen.findByText("1 projet dans le cloud")).toBeTruthy();
	});

	it("closes itself and opens the project modal on « Ouvrir un projet »", async () => {
		const { onClose, setOpenModalVisible } = setup();
		await screen.findByText("2 projets dans le cloud");

		fireEvent.click(screen.getByText("Ouvrir un projet"));

		expect(onClose).toHaveBeenCalled();
		expect(setOpenModalVisible).toHaveBeenCalledWith(true);
	});

	it("hides « Ouvrir un projet » outside a project context", async () => {
		setup({ withProjectStore: false });
		await screen.findByText("2 projets dans le cloud");

		expect(screen.queryByText("Ouvrir un projet")).toBeNull();
	});

	it("opens the delete confirmation with the cloud project count", async () => {
		setup();
		await screen.findByText("2 projets dans le cloud");
		expect(screen.queryByText(/delete-modal/)).toBeNull();

		fireEvent.click(screen.getByText("Supprimer mon compte"));

		await waitFor(() => expect(screen.getByText("delete-modal:2")).toBeTruthy());
	});

	it("closes and signs out on « Se déconnecter »", async () => {
		const { onClose } = setup();
		await screen.findByText("2 projets dans le cloud");

		fireEvent.click(screen.getByText("Se déconnecter"));

		expect(onClose).toHaveBeenCalled();
		expect(mockSignOut).toHaveBeenCalled();
	});
});
