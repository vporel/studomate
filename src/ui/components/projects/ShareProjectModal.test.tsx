/** @jest-environment jsdom */
import { act, fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "./ProjectContext";
import ShareProjectModal from "./ShareProjectModal";

jest.mock("./ProjectContext");

const unshareProject = jest.fn();
const setShareModalVisible = jest.fn();
const writeText = jest.fn();

function setup({
	visible = true,
	shareToken = "tok123" as string | null,
	isSharedProject = false,
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: { shareModalVisible: visible },
			setShareModalVisible,
			shareToken,
			sharingManager: { unshareProject },
			isSharedProject,
		}),
	);
	return renderWithI18n(<ShareProjectModal />);
}

const copiedMessage = "Lien copié dans le presse-papier.";

describe("ShareProjectModal", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		writeText.mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		window.history.replaceState(null, "", "/app?projectId=p1");
	});

	afterEach(() => jest.useRealTimers());

	it("renders nothing for a project opened through a share link", () => {
		const { container } = setup({ isSharedProject: true });

		expect(container).toBeEmptyDOMElement();
	});

	it("renders nothing while hidden", () => {
		setup({ visible: false });

		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("builds the link from the token and drops the project id", () => {
		setup();

		const url = new URL(
			(screen.getByLabelText("Lien de partage") as HTMLInputElement).value,
		);
		expect(url.searchParams.get("shareToken")).toBe("tok123");
		expect(url.searchParams.has("projectId")).toBe(false);
	});

	it("tells there is no active link without a token", () => {
		setup({ shareToken: null });

		expect(
			screen.getByText("Aucun lien de partage actif pour ce projet."),
		).toBeVisible();
		expect(screen.queryByLabelText("Lien de partage")).toBeNull();
		expect(screen.queryByRole("button", { name: "Révoquer" })).toBeNull();
	});

	it("copies the link then shows the copied message for 2 seconds", async () => {
		jest.useFakeTimers();
		setup();
		const link = (screen.getByLabelText("Lien de partage") as HTMLInputElement)
			.value;

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
		});

		expect(writeText).toHaveBeenCalledWith(link);
		expect(screen.getByText(copiedMessage)).toBeVisible();

		act(() => {
			jest.advanceTimersByTime(1999);
		});
		expect(screen.getByText(copiedMessage)).toBeVisible();

		act(() => {
			jest.advanceTimersByTime(1);
		});
		expect(screen.queryByText(copiedMessage)).toBeNull();
	});

	it("does not fail when unmounted before the copied message expires", async () => {
		jest.useFakeTimers();
		const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
		const { unmount } = setup();

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Copier le lien" }));
		});
		unmount();

		expect(() => {
			act(() => {
				jest.advanceTimersByTime(2000);
			});
		}).not.toThrow();
		expect(errorSpy).not.toHaveBeenCalled();
		errorSpy.mockRestore();
	});

	it("revokes the link", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Révoquer" }));

		expect(unshareProject).toHaveBeenCalledTimes(1);
	});

	it("closes with the footer Close button", () => {
		setup();

		const buttons = screen.getAllByRole("button", { name: "Fermer" });
		fireEvent.click(buttons[buttons.length - 1]);

		expect(setShareModalVisible).toHaveBeenCalledWith(false);
	});

	it("closes with the modal header close button", () => {
		setup();

		fireEvent.click(screen.getAllByRole("button", { name: "Fermer" })[0]);

		expect(setShareModalVisible).toHaveBeenCalledWith(false);
	});
});
