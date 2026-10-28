/**
 * @jest-environment jsdom
 */
import { Dialect } from "@/expression-language/dialect.enum";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { fireEvent, screen } from "@testing-library/react";
import { useProjectStore } from "./ProjectContext";
import DefaultDialectModal from "./DefaultDialectModal";

jest.mock("./ProjectContext");

let mockInterfaceLocale = "fr";
jest.mock("@/ui/i18n/LocaleProvider", () => ({
	useLocaleContext: () => ({ locale: mockInterfaceLocale }),
}));

function setup({ visible = true, onChosen = jest.fn() } = {}) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			ui: {
				defaultDialectModalVisible: visible,
				onDefaultDialectChosen: onChosen,
			},
		}),
	);
	renderWithI18n(<DefaultDialectModal />);
	return { onChosen };
}

describe("DefaultDialectModal", () => {
	afterEach(() => {
		jest.clearAllMocks();
		mockInterfaceLocale = "fr";
	});

	it("propose le français par défaut pour une interface française, validable directement", () => {
		const { onChosen } = setup();

		expect(screen.getByLabelText(/^Français : ET/)).toBeChecked();
		fireEvent.click(screen.getByRole("button", { name: "Valider" }));

		expect(onChosen).toHaveBeenCalledWith(Dialect.FR);
	});

	it("propose l'anglais d'office pour une interface anglaise", () => {
		mockInterfaceLocale = "en";
		const { onChosen } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Valider" }));

		expect(onChosen).toHaveBeenCalledWith(Dialect.EN);
	});

	it("transmet le dialecte choisi", () => {
		const { onChosen } = setup();

		fireEvent.click(screen.getByLabelText(/^Anglais : AND/));
		fireEvent.click(screen.getByRole("button", { name: "Valider" }));

		expect(onChosen).toHaveBeenCalledWith(Dialect.EN);
	});

	it("transmet null quand la popup est fermée sans valider", () => {
		const { onChosen } = setup();

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

		expect(onChosen).toHaveBeenCalledWith(null);
	});

	it("n'affiche rien tant que la popup n'est pas demandée", () => {
		setup({ visible: false });

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});
});
