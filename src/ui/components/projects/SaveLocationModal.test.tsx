/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { useProjectStore } from "./ProjectContext";
import { useAuthStore } from "@/ui/stores/auth/auth.store";
import { selectorImplementation } from "@tests/utils/store-mocks";
import SaveLocationModal from "./SaveLocationModal";

jest.mock("./ProjectContext");
jest.mock("@/ui/stores/auth/auth.store");

function setup({
	visible = true,
	onChosen = jest.fn(),
	authenticated = false,
} = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				saveLocationModalVisible: visible,
				onSaveLocationChosen: onChosen,
			},
		}),
	);
	(useAuthStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			user: authenticated ? { id: "u1" } : null,
			setAuthModalVisible: jest.fn(),
		}),
	);
	render(<SaveLocationModal />);
	return { onChosen };
}

describe("SaveLocationModal", () => {
	afterEach(() => jest.clearAllMocks());

	it("propose « Sur cet appareil » par défaut, activable directement", () => {
		const { onChosen } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

		expect(onChosen).toHaveBeenCalledWith("local");
	});

	it("désactive Enregistrer pour Cloud tant que l'utilisateur n'est pas connecté", () => {
		setup({ authenticated: false });

		fireEvent.click(screen.getByLabelText("Dans le cloud"));

		expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
		expect(screen.getByText("Se connecter")).toBeInTheDocument();
	});

	it("autorise Cloud une fois l'utilisateur connecté", () => {
		const { onChosen } = setup({ authenticated: true });

		fireEvent.click(screen.getByLabelText("Dans le cloud"));
		fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));

		expect(onChosen).toHaveBeenCalledWith("cloud");
	});

	it("annule avec un choix null", () => {
		const { onChosen } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

		expect(onChosen).toHaveBeenCalledWith(null);
	});

	it("ne rend rien quand la modale n'est pas visible", () => {
		setup({ visible: false });

		expect(screen.queryByText("Où enregistrer ce projet ?")).not.toBeInTheDocument();
	});
});
