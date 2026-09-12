/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { useProjectStore } from "../projects/ProjectContext";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import PreferencesPage, { PREFERENCES_PAGE_ID } from "./PreferencesPage";

jest.mock("../projects/ProjectContext");
jest.mock("@/ui/stores/auth/auth.store");

const mockGetPreferredSaveLocation = jest.fn();
const mockSetPreferredSaveLocation = jest.fn();
const mockGetPreferredLocale = jest.fn();
const mockSetPreferredLocale = jest.fn();
jest.mock("@/persistence/preferences.storage", () => ({
	getPreferredSaveLocation: (...args: unknown[]) =>
		mockGetPreferredSaveLocation(...args),
	setPreferredSaveLocation: (...args: unknown[]) =>
		mockSetPreferredSaveLocation(...args),
	getPreferredLocale: (...args: unknown[]) => mockGetPreferredLocale(...args),
	setPreferredLocale: (...args: unknown[]) => mockSetPreferredLocale(...args),
}));

function setup({ authenticated = true } = {}) {
	mockGetPreferredLocale.mockReturnValue(null);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({ activePageId: PREFERENCES_PAGE_ID }),
	);
	(useAuthStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			user: authenticated ? { id: "u1" } : null,
			setAuthModalVisible: jest.fn(),
		}),
	);
	renderWithI18n(<PreferencesPage />);
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

	it("propose le choix de la langue de l'interface", () => {
		mockGetPreferredSaveLocation.mockReturnValue("local");
		setup();

		expect(screen.getByLabelText("Français")).toBeChecked();
		expect(screen.getByLabelText("Anglais")).toBeInTheDocument();
	});
});
