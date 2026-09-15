/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { toast } from "react-toastify";
import TrainingModuleRow from "./TrainingModuleRow";

jest.mock("react-toastify", () => ({ toast: { info: jest.fn() } }));

let supabaseConfigured = false;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return supabaseConfigured;
	},
	supabase: {},
}));

const mockGetStepId = jest.fn();
jest.mock("@/persistence/repositories/training-progress.repository", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		getStepId: (...args: any[]) => mockGetStepId(...args),
	})),
}));

const defaultProps = {
	statusLabel: "Disponible",
	completedLabel: "Terminé",
	comingSoonLabel: "à venir",
	backgroundColor: "rgba(0,0,0,0)",
};

describe("TrainingModuleRow", () => {
	beforeEach(() => {
		supabaseConfigured = false;
		mockGetStepId.mockReset().mockResolvedValue(null);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it("un module disponible est un lien vers sa page", () => {
		renderWithI18n(
			<TrainingModuleRow
				{...defaultProps}
				label="Module 1"
				available
				href="/training/a1"
			/>,
		);

		expect(screen.getByRole("link", { name: /module 1/i })).toHaveAttribute(
			"href",
			"/formations/a1",
		);
	});

	it("un module pas encore disponible affiche un message au clic", () => {
		renderWithI18n(
			<TrainingModuleRow {...defaultProps} label="Module 2" available={false} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /module 2/i }));

		expect(toast.info).toHaveBeenCalledWith(
			"Ce module sera bientôt disponible.",
		);
	});

	it("un module pas encore disponible réagit aussi au clavier (Entrée)", () => {
		renderWithI18n(
			<TrainingModuleRow {...defaultProps} label="Module 3" available={false} />,
		);

		fireEvent.keyDown(screen.getByRole("button", { name: /module 3/i }), {
			key: "Enter",
		});

		expect(toast.info).toHaveBeenCalled();
	});

	const stepIds = ["intro", "theory-actions", "reading-errors"];

	it("affiche « Terminé » quand la dernière étape sauvegardée correspond au module", async () => {
		supabaseConfigured = true;
		mockGetStepId.mockResolvedValue("reading-errors");
		renderWithI18n(
			<TrainingModuleRow
				{...defaultProps}
				label="Module 1"
				available
				href="/training/a1"
				moduleId="a1"
				stepIds={stepIds}
			/>,
		);

		expect(await screen.findByText("Terminé")).toBeInTheDocument();
		expect(mockGetStepId).toHaveBeenCalledWith("a1");
	});

	it("affiche le nombre d'étapes atteint sur le total tant que le module n'est pas terminé", async () => {
		supabaseConfigured = true;
		mockGetStepId.mockResolvedValue("theory-actions");
		renderWithI18n(
			<TrainingModuleRow
				{...defaultProps}
				label="Module 1"
				available
				href="/training/a1"
				moduleId="a1"
				stepIds={stepIds}
			/>,
		);

		expect(await screen.findByText("2/3")).toBeInTheDocument();
		expect(screen.queryByText("Terminé")).not.toBeInTheDocument();
	});

	it("affiche 0 sur le total sans progression sauvegardée", async () => {
		supabaseConfigured = true;
		mockGetStepId.mockResolvedValue(null);
		renderWithI18n(
			<TrainingModuleRow
				{...defaultProps}
				label="Module 1"
				available
				href="/training/a1"
				moduleId="a1"
				stepIds={stepIds}
			/>,
		);

		expect(await screen.findByText("0/3")).toBeInTheDocument();
	});

	it("retombe sur le libellé générique sans moduleId/stepIds", () => {
		supabaseConfigured = true;
		renderWithI18n(
			<TrainingModuleRow
				{...defaultProps}
				label="Module 1"
				available
				href="/training/a1"
			/>,
		);

		expect(mockGetStepId).not.toHaveBeenCalled();
		expect(screen.getByText("Disponible")).toBeInTheDocument();
	});
});
