/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "../projects/ProjectContext";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import PreferencesPage, { PREFERENCES_PAGE_ID } from "./PreferencesPage";

jest.mock("../projects/ProjectContext");
jest.mock("@/ui/stores/auth/auth.store");

const mockGetPreferredSaveLocation = jest.fn();
const mockSetPreferredSaveLocation = jest.fn();
jest.mock("@/persistence/preferences.storage", () => ({
	getPreferredSaveLocation: (...args: unknown[]) =>
		mockGetPreferredSaveLocation(...args),
	setPreferredSaveLocation: (...args: unknown[]) =>
		mockSetPreferredSaveLocation(...args),
}));

function setup({ authenticated = true } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ activePageId: PREFERENCES_PAGE_ID }),
	);
	(useAuthStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			user: authenticated ? { id: "u1" } : null,
			setAuthModalVisible: jest.fn(),
		}),
	);
	render(<PreferencesPage />);
}

describe("PreferencesPage", () => {
	afterEach(() => jest.clearAllMocks());

	it("préselectionne le lieu déjà enregistré comme préférence", () => {
		mockGetPreferredSaveLocation.mockReturnValue("cloud");

		setup();

		expect(screen.getByLabelText("Dans le cloud")).toBeChecked();
	});

	it('affiche "Sur cet appareil" par défaut tant qu\'aucune préférence n\'existe', () => {
		mockGetPreferredSaveLocation.mockReturnValue(null);

		setup();

		expect(screen.getByLabelText("Sur cet appareil")).toBeChecked();
	});

	it("persiste immédiatement le nouveau choix", () => {
		mockGetPreferredSaveLocation.mockReturnValue("local");
		setup();

		fireEvent.click(screen.getByLabelText("Dans le cloud"));

		expect(mockSetPreferredSaveLocation).toHaveBeenCalledWith("cloud");
		expect(screen.getByLabelText("Dans le cloud")).toBeChecked();
	});
});
