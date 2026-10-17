/**
 * @jest-environment jsdom
 */
import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import type { HardwareTarget } from "@/schemas/hardware/hardware-target.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { useProjectStore } from "../projects/ProjectContext";
import { isWebSerialSupported } from "@/hardware/arduino/remote-io/web-serial.transport";
import HardwareConfigurationPage, {
	HARDWARE_CONFIGURATION_PAGE_ID,
} from "./HardwareConfigurationPage";

jest.mock("../projects/ProjectContext");
jest.mock("@/hardware/arduino/remote-io/web-serial.transport", () => ({
	isWebSerialSupported: jest.fn(() => true),
}));

const variable = (
	id: string,
	mnemonic: string,
	zone: "logic-input" | "logic-output" | "analog-input" | "memory",
	address: string,
) =>
	new VariableBuilder()
		.id(id)
		.mnemonic(mnemonic)
		.zone(zone)
		.type(zone === "analog-input" ? "INT" : "BOOL")
		.address(address)
		.build();

function setup({
	target = null,
	variables = [],
	mode = ProjectMode.DESIGN,
}: {
	target?: HardwareTarget | null;
	variables?: ReturnType<typeof variable>[];
	mode?: ProjectMode;
} = {}) {
	const setHardwareModel = jest.fn();
	const setHardwareTarget = jest.fn();
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			activePageId: HARDWARE_CONFIGURATION_PAGE_ID,
			mode,
			project: { hardwareTarget: target, variables },
			setHardwareModel,
			setHardwareTarget,
		}),
	);
	renderWithI18n(<HardwareConfigurationPage />);
	return { setHardwareModel, setHardwareTarget };
}

const UNO: HardwareTarget = { modelId: "arduino-uno-r3" };
const row = (address: string) => screen.getByTestId(`pin-row-${address}`);

describe("HardwareConfigurationPage : cible", () => {
	afterEach(() => jest.clearAllMocks());

	it("sans cible, affiche 'Aucune' et pas de tableau de broches", () => {
		setup();

		expect(
			screen.getByRole("combobox", { name: "Carte cible" }),
		).toHaveTextContent("Aucune (projet simulé)");
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});

	it("choisir l'Arduino Uno R3 appelle setHardwareModel", () => {
		const { setHardwareModel } = setup();

		fireEvent.mouseDown(screen.getByRole("combobox", { name: "Carte cible" }));
		fireEvent.click(screen.getByRole("option", { name: "Arduino Uno R3" }));

		expect(setHardwareModel).toHaveBeenCalledWith("arduino-uno-r3");
	});

	it("choisir 'Aucune' appelle setHardwareModel(null)", () => {
		const { setHardwareModel } = setup({ target: UNO });

		fireEvent.mouseDown(screen.getByRole("combobox", { name: "Carte cible" }));
		fireEvent.click(
			screen.getByRole("option", { name: "Aucune (projet simulé)" }),
		);

		expect(setHardwareModel).toHaveBeenCalledWith(null);
	});

	it("signale une carte inconnue sans afficher de tableau", () => {
		setup({ target: { modelId: "arduino-mega" } as unknown as HardwareTarget });

		expect(
			screen.getByText(/« arduino-mega » est inconnue/),
		).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
		expect(
			screen.getByRole("combobox", { name: "Carte cible" }),
		).toHaveTextContent("arduino-mega");
	});

	it("verrouille le choix de la carte hors du mode Conception", () => {
		setup({ target: UNO, mode: ProjectMode.SIMULATION });

		expect(
			screen.getByRole("combobox", { name: "Carte cible" }),
		).toHaveAttribute("aria-disabled", "true");
		expect(
			screen.getByText("Modifiable en mode Conception uniquement."),
		).toBeInTheDocument();
	});
});

describe("HardwareConfigurationPage : tableau des broches", () => {
	afterEach(() => jest.clearAllMocks());

	it("liste les 20 broches du descripteur", () => {
		setup({ target: UNO });

		expect(screen.getAllByTestId(/^pin-row-/)).toHaveLength(20);
	});

	it("explique le mode et l'inversion au-dessus du tableau", () => {
		setup({ target: UNO });

		expect(
			screen.getByText(/cochée, elle est vraie quand la broche est à 0 V/),
		).toBeInTheDocument();
	});

	it("marque %PD0 et %PD1 comme réservées, sans capacités", () => {
		setup({ target: UNO });

		for (const address of ["%PD0", "%PD1"]) {
			expect(
				within(row(address)).getByText("Réservée (liaison USB)"),
			).toBeInTheDocument();
			expect(
				within(row(address)).queryByText("Entrée TOR"),
			).not.toBeInTheDocument();
		}
	});

	it("affiche les capacités : PWM sur D3 mais pas sur D4, entrée analogique sur A0", () => {
		setup({ target: UNO });

		expect(within(row("%PD3")).getByText("Sortie PWM")).toBeInTheDocument();
		expect(
			within(row("%PD4")).queryByText("Sortie PWM"),
		).not.toBeInTheDocument();
		expect(
			within(row("%PA0")).getByText("Entrée analogique"),
		).toBeInTheDocument();
	});

	it("affiche la variable liée à une broche, ou un tiret", () => {
		setup({
			target: UNO,
			variables: [
				variable("1", "bouton", "logic-input", "%PD2"),
				variable("2", "lampe", "logic-output", "%PD13"),
			],
		});

		expect(within(row("%PD2")).getByText("bouton")).toBeInTheDocument();
		expect(within(row("%PD13")).getByText("lampe")).toBeInTheDocument();
		expect(within(row("%PD4")).getByText("-")).toBeInTheDocument();
	});

	it("ne tient pas compte d'une variable sans adresse", () => {
		setup({
			target: UNO,
			variables: [
				new VariableBuilder()
					.id("1")
					.mnemonic("libre")
					.zone("logic-input")
					.type("BOOL")
					.build(),
			],
		});

		expect(screen.queryByText("libre")).not.toBeInTheDocument();
	});

	it("n'expose mode et inversion que pour une entrée TOR", () => {
		setup({
			target: UNO,
			variables: [
				variable("1", "bouton", "logic-input", "%PD2"),
				variable("2", "lampe", "logic-output", "%PD13"),
				variable("3", "pot", "analog-input", "%PA0"),
				variable("4", "mem", "memory", "%PD5"),
			],
		});

		expect(
			within(row("%PD2")).getByRole("combobox", {
				name: "Mode d'entrée de la broche D2",
			}),
		).toBeInTheDocument();
		expect(within(row("%PD2")).getByRole("checkbox")).toBeInTheDocument();
		for (const address of ["%PD13", "%PA0", "%PD5", "%PD4"]) {
			expect(
				within(row(address)).queryByRole("combobox"),
			).not.toBeInTheDocument();
			expect(
				within(row(address)).queryByRole("checkbox"),
			).not.toBeInTheDocument();
		}
	});

	it("affiche les valeurs par défaut : pull-up interne et inversée", () => {
		setup({
			target: UNO,
			variables: [variable("1", "bouton", "logic-input", "%PD2")],
		});

		expect(
			within(row("%PD2")).getByRole("combobox", {
				name: "Mode d'entrée de la broche D2",
			}),
		).toHaveTextContent("Avec pull-up interne");
		expect(within(row("%PD2")).getByRole("checkbox")).toBeChecked();
	});

	it("affiche la configuration explicite d'une broche", () => {
		setup({
			target: {
				modelId: "arduino-uno-r3",
				pins: { "%PD2": { mode: "INPUT", inverted: false } },
			},
			variables: [variable("1", "bouton", "logic-input", "%PD2")],
		});

		expect(
			within(row("%PD2")).getByRole("combobox", {
				name: "Mode d'entrée de la broche D2",
			}),
		).toHaveTextContent("Entrée flottante");
		expect(within(row("%PD2")).getByRole("checkbox")).not.toBeChecked();
	});

	it("décocher l'inversion appelle setHardwareTarget avec inverted: false", () => {
		const { setHardwareTarget } = setup({
			target: UNO,
			variables: [variable("1", "bouton", "logic-input", "%PD2")],
		});

		fireEvent.click(within(row("%PD2")).getByRole("checkbox"));

		expect(setHardwareTarget).toHaveBeenCalledWith({
			modelId: "arduino-uno-r3",
			pins: { "%PD2": { inverted: false } },
		});
	});

	it("changer le mode appelle setHardwareTarget avec le nouveau mode", () => {
		const { setHardwareTarget } = setup({
			target: UNO,
			variables: [variable("1", "bouton", "logic-input", "%PD2")],
		});

		fireEvent.mouseDown(
			within(row("%PD2")).getByRole("combobox", {
				name: "Mode d'entrée de la broche D2",
			}),
		);
		fireEvent.click(screen.getByRole("option", { name: "Entrée flottante" }));

		expect(setHardwareTarget).toHaveBeenCalledWith({
			modelId: "arduino-uno-r3",
			pins: { "%PD2": { mode: "INPUT" } },
		});
	});

	it("verrouille mode et inversion hors du mode Conception", () => {
		const { setHardwareTarget } = setup({
			target: UNO,
			variables: [variable("1", "bouton", "logic-input", "%PD2")],
			mode: ProjectMode.SIMULATION,
		});

		expect(
			within(row("%PD2")).getByRole("combobox", {
				name: "Mode d'entrée de la broche D2",
			}),
		).toHaveAttribute("aria-disabled", "true");
		expect(within(row("%PD2")).getByRole("checkbox")).toBeDisabled();
		expect(setHardwareTarget).not.toHaveBeenCalled();
	});
});

describe("HardwareConfigurationPage : compatibilité navigateur", () => {
	const message = /nécessite un navigateur basé sur Chromium/;

	afterEach(() => (isWebSerialSupported as jest.Mock).mockReturnValue(true));

	it("n'affiche pas de bandeau quand Web Serial est disponible", () => {
		setup({ target: UNO });
		expect(screen.queryByText(message)).toBeNull();
	});

	it("n'affiche pas le bandeau sans carte sélectionnée", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		setup({ target: null });
		expect(screen.queryByText(message)).toBeNull();
	});

	it("explique le besoin d'un navigateur Chromium sans bloquer la configuration", () => {
		(isWebSerialSupported as jest.Mock).mockReturnValue(false);
		setup({ target: UNO });

		expect(screen.getByText(message)).toBeInTheDocument();
		expect(screen.getByTestId("pin-row-%PD2")).toBeInTheDocument();
	});
});
