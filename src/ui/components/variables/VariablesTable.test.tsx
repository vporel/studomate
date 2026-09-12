/**
 * @jest-environment jsdom
 */
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { useProjectStore } from "../projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import Variable from "@/schemas/variable/variable.schema";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { exportVariablesTablePdf } from "@/ui/lib/pdf/variables-table-pdf";
import VariablesTable from "./VariablesTable";

jest.mock("../projects/ProjectContext");
jest.mock("@/ui/lib/pdf/variables-table-pdf", () => ({
	exportVariablesTablePdf: jest.fn().mockResolvedValue(undefined),
}));

function setupWithVariables(
	variables: Variable[],
	removeVariables = jest.fn(),
) {
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			variablesManager: {
				existsByMnemonic: () => undefined,
				existsByAddress: () => undefined,
				removeVariables,
			},
			project: { variables },
			mode: ProjectMode.DESIGN,
		}),
	);
	renderWithI18n(<VariablesTable zones={["logic-input"]} pageTitle="Variables" />);
	return { removeVariables };
}

describe("VariablesTable", () => {
	it("lève si aucune zone n'est fournie", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {},
				project: { variables: [] },
				mode: ProjectMode.DESIGN,
			}),
		);
		expect(() => renderWithI18n(<VariablesTable zones={[]} pageTitle="Variables" />)).toThrow();
	});

	it("affiche une ligne par variable des zones demandées, plus la ligne vide d'ajout", () => {
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {
					existsByMnemonic: () => undefined,
					existsByAddress: () => undefined,
				},
				project: {
					variables: [
						new Variable("v1", "I0", "logic-input", "BOOL"),
						new Variable("v2", "M0", "memory", "BOOL"),
					],
				},
				mode: ProjectMode.DESIGN,
			}),
		);

		renderWithI18n(<VariablesTable zones={["logic-input"]} pageTitle="Variables" />);

		expect(screen.getByText("I0")).toBeInTheDocument();
		expect(screen.queryByText("M0")).not.toBeInTheDocument();
	});

	it("désactive le bouton de suppression tant qu'aucune ligne n'est sélectionnée", () => {
		setupWithVariables([new Variable("v1", "I0", "logic-input", "BOOL")]);
		const deleteButton = screen
			.getAllByRole("button")
			.find((b) => b.querySelector('[data-testid="DeleteIcon"]'))!;
		expect(deleteButton).toBeDisabled();
	});

	it("supprime les variables sélectionnées au clic sur le bouton de suppression", () => {
		const { removeVariables } = setupWithVariables([
			new Variable("v1", "I0", "logic-input", "BOOL"),
		]);

		const rowCheckbox = screen.getAllByRole("checkbox")[1]; // [0] = case "tout sélectionner"
		fireEvent.click(rowCheckbox);
		const deleteButton = screen
			.getAllByRole("button")
			.find((b) => b.querySelector('[data-testid="DeleteIcon"]'))!;
		fireEvent.click(deleteButton);

		expect(removeVariables).toHaveBeenCalledWith(["v1"]);
	});

	it("n'affiche pas les variables appartenant à un bloc système (ownerBlock)", () => {
		const userVar = new Variable("v1", "M0", "memory", "BOOL");
		const blockVar = new Variable("v2", "Tempo1.PT", "memory", "TIME", {
			id: "block1",
		});
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {
					existsByMnemonic: () => undefined,
					existsByAddress: () => undefined,
				},
				project: { variables: [userVar, blockVar] },
				mode: ProjectMode.DESIGN,
			}),
		);

		renderWithI18n(<VariablesTable zones={["memory"]} pageTitle="Variables" />);

		expect(screen.getByText("M0")).toBeInTheDocument();
		expect(screen.queryByText("Tempo1.PT")).not.toBeInTheDocument();
	});

	it("filtre les lignes affichées via la recherche rapide", async () => {
		setupWithVariables([
			new Variable("v1", "I0", "logic-input", "BOOL"),
			new Variable("v2", "I1", "logic-input", "BOOL"),
		]);

		fireEvent.click(screen.getByRole("button", { name: "Rechercher" }));
		fireEvent.change(screen.getByPlaceholderText("Rechercher..."), {
			target: { value: "I0" },
		});

		await waitFor(() =>
			expect(screen.queryByText("I1")).not.toBeInTheDocument(),
		);
		expect(screen.getByText("I0")).toBeInTheDocument();
	});

	it("localise le DataGrid selon la langue de l'interface", () => {
		window.localStorage.setItem("studomate_locale", "en");
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {
					existsByMnemonic: () => undefined,
					existsByAddress: () => undefined,
					removeVariables: jest.fn(),
				},
				project: { variables: [] },
				mode: ProjectMode.DESIGN,
			}),
		);

		renderWithI18n(
			<LocaleProvider>
				<VariablesTable zones={["logic-input"]} pageTitle="Variables" />
			</LocaleProvider>,
		);

		expect(
			screen.getByRole("button", { name: "Search" }),
		).toBeInTheDocument();
		window.localStorage.removeItem("studomate_locale");
	});

	describe("insertion d'une variable via le menu contextuel", () => {
		function rowIds() {
			return Array.from(
				document.querySelectorAll(".MuiDataGrid-row"),
			).map((r) => r.getAttribute("data-id"));
		}

		function openInsert() {
			fireEvent.contextMenu(screen.getByText("I0"));
			fireEvent.click(screen.getByText("Insérer une variable"));
		}

		it("insère une ligne brouillon juste sous la variable cliquée, avant la ligne d'ajout", async () => {
			(useProjectStore as unknown as jest.Mock).mockImplementation(
				selectorImplementation({
					variablesManager: {
						existsByMnemonic: () => undefined,
						existsByAddress: () => undefined,
						addVariables: jest.fn(),
					},
					project: {
						variables: [
							new Variable("v1", "I0", "logic-input", "BOOL"),
							new Variable("v2", "I1", "logic-input", "BOOL"),
						],
					},
					mode: ProjectMode.DESIGN,
				}),
			);
			renderWithI18n(<VariablesTable zones={["logic-input"]} pageTitle="Variables" />);

			openInsert();

			await waitFor(() => {
				const ids = rowIds();
				expect(ids[0]).toBe("v1");
				expect(ids[1]).toMatch(/^draft-/);
				expect(ids[2]).toBe("v2");
				expect(ids[ids.length - 1]).toBe("new-variable");
			});
		});

		it("reprend le type de la variable cliquée pour la ligne brouillon", async () => {
			const addVariables = jest.fn();
			(useProjectStore as unknown as jest.Mock).mockImplementation(
				selectorImplementation({
					variablesManager: {
						existsByMnemonic: () => undefined,
						existsByAddress: () => undefined,
						addVariables,
					},
					project: {
						variables: [new Variable("v1", "C0", "memory", "INT")],
					},
					mode: ProjectMode.DESIGN,
				}),
			);
			renderWithI18n(<VariablesTable zones={["memory"]} pageTitle="Variables" />);

			fireEvent.contextMenu(screen.getByText("C0"));
			fireEvent.click(screen.getByText("Insérer une variable"));

			await waitFor(() => {
				const draftRow = Array.from(
					document.querySelectorAll(".MuiDataGrid-row"),
				).find((r) => r.getAttribute("data-id")?.startsWith("draft-"))!;
				expect(draftRow.textContent).toContain("INT");
			});
		});
	});

	it("le bouton « Nouvelle variable » passe la ligne d'ajout du bas en édition", async () => {
		setupWithVariables([new Variable("v1", "I0", "logic-input", "BOOL")]);

		fireEvent.click(screen.getByRole("button", { name: "Nouvelle variable" }));

		await waitFor(() => {
			const newRow = document.querySelector(
				'.MuiDataGrid-row[data-id="new-variable"]',
			)!;
			expect(newRow.querySelector("input")).not.toBeNull();
		});
	});

	it("valide au clavier sans perdre les derniers caractères (Entrée juste après la frappe)", async () => {
		const addVariables = jest.fn();
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				variablesManager: {
					existsByMnemonic: () => undefined,
					existsByAddress: () => undefined,
					addVariables,
				},
				project: { variables: [] },
				mode: ProjectMode.DESIGN,
			}),
		);
		renderWithI18n(
			<VariablesTable zones={["logic-input"]} pageTitle="Variables" />,
		);

		fireEvent.click(screen.getByRole("button", { name: "Nouvelle variable" }));

		const input = (await waitFor(() => {
			const el = document.querySelector(
				'.MuiDataGrid-row[data-id="new-variable"] .MuiDataGrid-cell[data-field="mnemonic"] input',
			);
			if (!el) throw new Error("input pas encore rendu");
			return el;
		})) as HTMLInputElement;

		// Frappe rapide puis Entrée immédiate, sans laisser le debounce s'écouler.
		fireEvent.change(input, { target: { value: "Feu_Ora" } });
		fireEvent.change(input, { target: { value: "Feu_Orange" } });
		fireEvent.keyDown(input, { key: "Enter" });

		await waitFor(() => expect(addVariables).toHaveBeenCalled());
		expect(addVariables).toHaveBeenCalledWith([
			expect.objectContaining({ mnemonic: "Feu_Orange" }),
		]);
	});

	it("exporte toutes les variables de la zone en PDF depuis le menu d'export", async () => {
		setupWithVariables([
			new Variable("v1", "I1", "logic-input", "BOOL"),
			new Variable("v2", "I0", "logic-input", "BOOL"),
		]);

		fireEvent.click(screen.getByRole("button", { name: "Exporter" }));
		fireEvent.click(await screen.findByText("Exporter en PDF"));

		expect(exportVariablesTablePdf).toHaveBeenCalledTimes(1);
		const arg = (exportVariablesTablePdf as jest.Mock).mock.calls[0][0];
		expect(arg.variables).toHaveLength(2);
		expect(arg.filename).toContain("Variables");
	});

	describe("révélation d'une variable (variableToReveal)", () => {
		function setupReveal(
			variableToReveal: string | null,
			zones: Variable["zone"][] = ["logic-input"],
		) {
			const setVariableToReveal = jest.fn();
			(useProjectStore as unknown as jest.Mock).mockImplementation(
				selectorImplementation({
					variablesManager: {
						existsByMnemonic: () => undefined,
						existsByAddress: () => undefined,
					},
					project: {
						variables: [
							new Variable("v1", "I0", "logic-input", "BOOL"),
							new Variable("v2", "M0", "memory", "BOOL"),
						],
					},
					mode: ProjectMode.DESIGN,
					variableToReveal,
					setVariableToReveal,
				}),
			);
			renderWithI18n(<VariablesTable zones={zones} pageTitle="Variables" />);
			return { setVariableToReveal };
		}

		it("surligne la ligne ciblée et consomme le signal quand la zone correspond", async () => {
			const { setVariableToReveal } = setupReveal("v1");

			await waitFor(() =>
				expect(
					document.querySelector(".MuiDataGrid-row.row-revealed"),
				).not.toBeNull(),
			);
			expect(setVariableToReveal).toHaveBeenCalledWith(null);
		});

		it("ignore le signal quand la variable n'appartient pas aux zones de la table", async () => {
			const { setVariableToReveal } = setupReveal("v2", ["logic-input"]);

			await waitFor(() => expect(screen.getByText("I0")).toBeInTheDocument());
			expect(setVariableToReveal).not.toHaveBeenCalled();
			expect(
				document.querySelector(".MuiDataGrid-row.row-revealed"),
			).toBeNull();
		});
	});
});
