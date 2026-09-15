/**
 * @jest-environment jsdom
 */
import { act, fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ModuleStepper, { StepData } from "./ModuleStepper";

let supabaseConfigured = false;
jest.mock("@/persistence/repositories/supabase-client", () => ({
	get isSupabaseConfigured() {
		return supabaseConfigured;
	},
	supabase: {},
}));

const mockGetStepId = jest.fn();
const mockSaveStepId = jest.fn();
jest.mock("@/persistence/repositories/training-progress.repository", () => ({
	__esModule: true,
	default: jest.fn().mockImplementation(() => ({
		getStepId: (...args: any[]) => mockGetStepId(...args),
		saveStepId: (...args: any[]) => mockSaveStepId(...args),
	})),
}));

let mockUser: { id: string } | null = null;
const mockInit = jest.fn();
jest.mock("@/ui/stores/auth/auth.store", () => ({
	useAuthStore: (selector: any) => selector({ user: mockUser, init: mockInit }),
}));

const steps: StepData[] = [
	{ id: "s1", kind: "theory", title: "Étape un", body: ["Corps un"] },
	{ id: "s2", kind: "theory", title: "Étape deux", body: ["Corps deux"] },
	{
		id: "s3",
		kind: "exercise",
		title: "Étape trois",
		body: ["Corps trois"],
		cta: { templateId: "linear-sequence", exerciseLabel: "Ouvrir l'exercice" },
	},
	{
		id: "s4",
		kind: "synthesis",
		title: "Étape quatre",
		body: ["Corps quatre"],
		cta: {
			templateId: "linear-sequence",
			exerciseLabel: "Énoncé",
			solutionLabel: "Corrigé",
		},
	},
];

function setup(
	initialHash = "",
	nextModule?: { href: "/training/a1"; label: string },
) {
	window.location.hash = initialHash;
	return renderWithI18n(
		<ModuleStepper
			steps={steps}
			prevLabel="Précédent"
			nextLabel="Suivant"
			moduleId="a1"
			nextModule={nextModule}
		/>,
	);
}

/** Mocks `useMediaQuery` results — `matches: true` simulates the stacked (mobile) layout. */
function mockViewport(matches: boolean) {
	window.matchMedia = jest.fn().mockImplementation((query: string) => ({
		matches,
		media: query,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	}));
}

describe("ModuleStepper", () => {
	beforeEach(() => {
		supabaseConfigured = false;
		mockUser = null;
		mockGetStepId.mockReset().mockResolvedValue(null);
		mockSaveStepId.mockReset();
		mockInit.mockReset();
	});

	afterEach(() => {
		window.location.hash = "";
	});

	it("affiche la première étape par défaut", () => {
		setup();
		expect(
			screen.getByRole("heading", { name: "Étape un" }),
		).toBeInTheDocument();
		expect(screen.getByText("Corps un")).toBeInTheDocument();
		expect(screen.queryByText("Corps deux")).not.toBeInTheDocument();
	});

	it("liste les titres des 9 étapes dans le sommaire", () => {
		setup();
		expect(
			screen.getByRole("button", { name: /étape deux/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /étape trois/i }),
		).toBeInTheDocument();
	});

	it("restaure l'étape indiquée par l'ancre de l'URL au montage", () => {
		setup("#step-s3");
		expect(screen.getByText("Corps trois")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /ouvrir l'exercice/i }),
		).toBeInTheDocument();
	});

	it("affiche énoncé et corrigé quand l'étape en propose deux, vers le bon template-mode", () => {
		setup("#step-s4");
		const exerciseLink = screen.getByRole("link", { name: "Énoncé" });
		const solutionLink = screen.getByRole("link", { name: "Corrigé" });
		expect(exerciseLink).toHaveAttribute(
			"href",
			expect.stringContaining("template=linear-sequence"),
		);
		expect(exerciseLink).not.toHaveAttribute(
			"href",
			expect.stringContaining("template-mode"),
		);
		expect(solutionLink).toHaveAttribute(
			"href",
			expect.stringContaining("template=linear-sequence&template-mode=solution"),
		);
	});

	it("ouvre le template en mode solution quand primaryMode vaut solution, sans second bouton", () => {
		renderWithI18n(
			<ModuleStepper
				steps={[
					{
						id: "s1",
						kind: "theory",
						title: "Observer",
						body: ["Corps"],
						cta: {
							templateId: "traffic-light",
							exerciseLabel: "Observer la simulation",
							primaryMode: "solution",
						},
					},
				]}
				prevLabel="Précédent"
				nextLabel="Suivant"
				moduleId="a0"
			/>,
		);

		expect(
			screen.getByRole("link", { name: "Observer la simulation" }),
		).toHaveAttribute(
			"href",
			expect.stringContaining("template=traffic-light&template-mode=solution"),
		);
		expect(screen.queryByRole("link", { name: "Corrigé" })).not.toBeInTheDocument();
	});

	it("n'affiche qu'un bouton quand l'étape ne propose pas de corrigé", () => {
		setup("#step-s3");
		expect(screen.getByRole("link", { name: "Ouvrir l'exercice" })).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "Corrigé" })).not.toBeInTheDocument();
	});

	it("ignore une ancre invalide et reste sur la première étape", () => {
		setup("#not-a-step");
		expect(screen.getByText("Corps un")).toBeInTheDocument();
	});

	it("Suivant affiche l'étape suivante et met à jour l'ancre", () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
		expect(screen.getByText("Corps deux")).toBeInTheDocument();
		expect(window.location.hash).toBe("#step-s2");
	});

	it("Précédent est désactivé sur la première étape", () => {
		setup();
		expect(screen.getByRole("button", { name: "Précédent" })).toBeDisabled();
	});

	it("Suivant est désactivé sur la dernière étape", () => {
		setup("#step-s4");
		expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
	});

	it("remplace Suivant par un lien vers le module suivant sur la dernière étape, quand disponible", () => {
		setup("#step-s4", { href: "/training/a1", label: "Passer au module 1" });

		expect(
			screen.queryByRole("button", { name: "Suivant" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Passer au module 1" }),
		).toBeInTheDocument();
	});

	it("garde Suivant désactivé sur la dernière étape même avec nextModule si ce n'est pas la dernière visitée", () => {
		setup("#step-s3", { href: "/training/a1", label: "Passer au module 1" });

		expect(screen.getByRole("button", { name: "Suivant" })).toBeEnabled();
		expect(
			screen.queryByRole("link", { name: "Passer au module 1" }),
		).not.toBeInTheDocument();
	});

	it("le sommaire permet de sauter directement à une étape via son titre", () => {
		setup();
		fireEvent.click(screen.getByRole("button", { name: /étape trois/i }));
		expect(screen.getByText("Corps trois")).toBeInTheDocument();
		expect(window.location.hash).toBe("#step-s3");
	});

	it("met en gras dans le sommaire le titre d'une étape de synthèse, même inactive", () => {
		setup();
		const synthesisItem = screen.getByRole("button", { name: /étape quatre/i });
		expect(within(synthesisItem).getByText("Étape quatre")).toHaveStyle({
			fontWeight: 700,
		});

		const theoryItem = screen.getByRole("button", { name: /étape deux/i });
		expect(within(theoryItem).getByText("Étape deux")).not.toHaveStyle({
			fontWeight: 700,
		});
	});

	it("ramène le contenu dans le viewport après un changement d'étape en layout empilé (mobile)", () => {
		mockViewport(true);
		const scrollIntoView = jest.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		setup();

		fireEvent.click(screen.getByRole("button", { name: /étape deux/i }));

		expect(scrollIntoView).toHaveBeenCalledWith({
			behavior: "smooth",
			block: "start",
		});
	});

	it("ne force pas de scroll en layout côte à côte (desktop), où le contenu reste visible", () => {
		mockViewport(false);
		const scrollIntoView = jest.fn();
		Element.prototype.scrollIntoView = scrollIntoView;
		setup();

		fireEvent.click(screen.getByRole("button", { name: /étape deux/i }));

		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	it("coche les étapes déjà franchies dans le sommaire pour un utilisateur connecté, pas l'étape active ni les suivantes", () => {
		supabaseConfigured = true;
		mockUser = { id: "u1" };
		setup();
		const item1 = screen.getByRole("button", { name: /étape un/i });
		const item2 = screen.getByRole("button", { name: /étape deux/i });
		const item3 = screen.getByRole("button", { name: /étape trois/i });
		expect(within(item1).queryByTestId("CheckIcon")).not.toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2
		fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s3

		expect(within(item1).getByTestId("CheckIcon")).toBeInTheDocument();
		expect(within(item2).getByTestId("CheckIcon")).toBeInTheDocument();
		expect(within(item3).queryByTestId("CheckIcon")).not.toBeInTheDocument();
	});

	it("garde la coche sur une étape déjà franchie même en y revenant, pour un utilisateur connecté", () => {
		supabaseConfigured = true;
		mockUser = { id: "u1" };
		setup();
		const item1 = screen.getByRole("button", { name: /étape un/i });

		fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2
		fireEvent.click(screen.getByRole("button", { name: "Précédent" })); // -> s1, déjà franchie

		expect(within(item1).getByTestId("CheckIcon")).toBeInTheDocument();
	});

	it("n'affiche aucune coche pour un visiteur non connecté (l'ordre n'étant pas garanti)", () => {
		setup();

		fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2
		fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s3

		expect(screen.queryAllByTestId("CheckIcon")).toHaveLength(0);
	});

	describe("verrouillage du sommaire (compte connecté uniquement)", () => {
		it("verrouille les étapes non atteintes pour un utilisateur connecté", () => {
			supabaseConfigured = true;
			mockUser = { id: "u1" };
			setup();

			const item3 = screen.getByRole("button", { name: /étape trois/i });
			expect(item3).toBeDisabled();

			fireEvent.click(item3);
			expect(screen.queryByText("Corps trois")).not.toBeInTheDocument();
			expect(screen.getByText("Corps un")).toBeInTheDocument();
		});

		it("laisse cliquables les étapes déjà atteintes pour un utilisateur connecté", () => {
			supabaseConfigured = true;
			mockUser = { id: "u1" };
			setup();

			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2

			const item1 = screen.getByRole("button", { name: /étape un/i });
			expect(item1).not.toBeDisabled();
			fireEvent.click(item1);
			expect(screen.getByText("Corps un")).toBeInTheDocument();
		});

		it("ne verrouille rien pour un visiteur non connecté, même avec le cloud configuré", () => {
			supabaseConfigured = true;
			mockUser = null;
			setup();

			const item3 = screen.getByRole("button", { name: /étape trois/i });
			expect(item3).not.toBeDisabled();
			fireEvent.click(item3);
			expect(screen.getByText("Corps trois")).toBeInTheDocument();
		});

		it("ne verrouille rien quand le cloud n'est pas configuré, même avec un utilisateur", () => {
			supabaseConfigured = false;
			mockUser = { id: "u1" };
			setup();

			const item3 = screen.getByRole("button", { name: /étape trois/i });
			expect(item3).not.toBeDisabled();
		});
	});

	describe("reprise de progression (compte requis)", () => {
		it("reprend l'étape sauvegardée pour le module quand il n'y a pas d'ancre dans l'URL", async () => {
			supabaseConfigured = true;
			mockGetStepId.mockResolvedValue("s3");
			setup();

			expect(await screen.findByText("Corps trois")).toBeInTheDocument();
			expect(mockGetStepId).toHaveBeenCalledWith("a1");
		});

		it("reste sur la première étape si l'étape sauvegardée n'existe plus dans le module", async () => {
			supabaseConfigured = true;
			mockGetStepId.mockResolvedValue("removed-step");
			setup();

			await Promise.resolve();
			expect(screen.getByText("Corps un")).toBeInTheDocument();
		});

		it("l'ancre de l'URL garde la priorité sur la progression sauvegardée", async () => {
			supabaseConfigured = true;
			mockGetStepId.mockResolvedValue("s3");
			setup("#step-s2");

			expect(screen.getByText("Corps deux")).toBeInTheDocument();
			await Promise.resolve();
			expect(screen.getByText("Corps deux")).toBeInTheDocument();
		});

		it("sauvegarde la nouvelle étape courante à chaque navigation", () => {
			supabaseConfigured = true;
			setup();

			fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

			expect(mockSaveStepId).toHaveBeenCalledWith("a1", "s2");
		});

		it("ne sauvegarde rien quand le cloud n'est pas configuré", () => {
			supabaseConfigured = false;
			setup();

			fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

			expect(mockSaveStepId).not.toHaveBeenCalled();
		});

		it("ne redescend jamais la progression sauvegardée en revenant en arrière", () => {
			supabaseConfigured = true;
			setup();

			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2
			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s3
			mockSaveStepId.mockClear();

			fireEvent.click(screen.getByRole("button", { name: "Précédent" })); // -> s2

			expect(mockSaveStepId).not.toHaveBeenCalled();
			expect(screen.getByText("Corps deux")).toBeInTheDocument();
		});

		it("ne resauvegarde pas en revenant sur l'étape déjà connue comme la plus avancée", () => {
			supabaseConfigured = true;
			setup();

			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2
			mockSaveStepId.mockClear();

			fireEvent.click(screen.getByRole("button", { name: "Précédent" })); // -> s1
			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2 à nouveau

			expect(mockSaveStepId).not.toHaveBeenCalled();
		});

		it("ne redescend pas la progression connue même si l'ancre pointe vers une étape antérieure", async () => {
			supabaseConfigured = true;
			mockGetStepId.mockResolvedValue("s3");
			setup("#step-s1");

			// laisse le temps à la progression sauvegardée (s3) d'être prise en compte
			await act(async () => {
				await Promise.resolve();
				await Promise.resolve();
			});

			fireEvent.click(screen.getByRole("button", { name: "Suivant" })); // -> s2, sous s3

			expect(mockSaveStepId).not.toHaveBeenCalled();
		});
	});
});
