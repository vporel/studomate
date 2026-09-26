/**
 * @jest-environment jsdom
 */
import { fireEvent, screen } from "@testing-library/react";
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { InputBehavior } from "@/schemas/variable/input-behavior";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import { HmiWidgetPropertyField } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import HmiWidgetPropertyFields, { groupPropertyFields } from "./HmiWidgetPropertyFields";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/projects/ProjectContext");

const field = (
	kind: HmiWidgetPropertyField<unknown>["kind"],
	label: string,
): HmiWidgetPropertyField<unknown> =>
	({ kind, label, get: () => undefined, set: (d: unknown) => d }) as unknown as HmiWidgetPropertyField<unknown>;

describe("groupPropertyFields", () => {
	it("apparie deux champs couleur qui se suivent", () => {
		const groups = groupPropertyFields([
			field("color", "Remplissage"),
			field("color", "Contour"),
			field("number", "Épaisseur du contour"),
		]);
		expect(groups).toHaveLength(2);
		expect(Array.isArray(groups[0])).toBe(true);
		expect((groups[0] as HmiWidgetPropertyField<unknown>[]).map((f) => f.label)).toEqual([
			"Remplissage",
			"Contour",
		]);
		expect(groups[1]).toMatchObject({ label: "Épaisseur du contour" });
	});

	it("laisse seul un champ couleur isolé", () => {
		const groups = groupPropertyFields([
			field("text", "Texte"),
			field("color", "Remplissage"),
		]);
		expect(groups.map((g) => (Array.isArray(g) ? "pair" : g.kind))).toEqual([
			"text",
			"color",
		]);
	});

	it("n'apparie pas au-delà de deux : trois couleurs -> une paire + une seule", () => {
		const groups = groupPropertyFields([
			field("color", "A"),
			field("color", "B"),
			field("color", "C"),
		]);
		expect(groups).toHaveLength(2);
		expect(Array.isArray(groups[0])).toBe(true);
		expect(Array.isArray(groups[1])).toBe(false);
	});
});

describe("HmiWidgetPropertyFields — champs imposés par le comportement de l'entrée liée", () => {
	function setup(widget: HmiWidget, behavior: InputBehavior | null) {
		const updateWidget = jest.fn();
		(useHmiStore as jest.Mock).mockImplementation(selectorImplementation({ updateWidget }));
		(useProjectStore as unknown as jest.Mock).mockImplementation(
			selectorImplementation({
				project: {
					variables: [{ mnemonic: (widget.data as { variable: string }).variable, behavior }],
				},
			}),
		);
		renderWithI18n(<HmiWidgetPropertyFields widget={widget} />);
		return { updateWidget };
	}

	const pushButton = {
		id: "w1",
		type: "push-button",
		data: { variable: "arret", label: "Arrêt", behavior: "toggle" },
	} as unknown as HmiWidget;

	it("grise le comportement d'un bouton poussoir lié à une entrée bouton poussoir et affiche la valeur imposée", () => {
		setup(pushButton, { kind: "push-button-nc", params: null });

		const select = screen.getByRole("combobox");
		expect(select).toHaveAttribute("aria-disabled", "true");
		expect(select).toHaveTextContent("Impulsionnel NF");
	});

	it("explique au survol d'où vient la valeur imposée", async () => {
		setup(pushButton, { kind: "push-button-nc", params: null });

		fireEvent.mouseOver(screen.getByRole("combobox").closest(".MuiTextField-root")!.parentElement!);

		expect(
			await screen.findByText(/Imposé par le comportement de la variable « arret » \(Bouton poussoir NF\)/),
		).toBeInTheDocument();
	});

	it("laisse le champ libre quand la variable liée n'a pas de comportement", () => {
		setup(pushButton, null);

		const select = screen.getByRole("combobox");
		expect(select).not.toHaveAttribute("aria-disabled");
		expect(select).toHaveTextContent("Bascule (inversion)");
	});

	it("grise et impose les bornes d'une saisie numérique liée à un curseur", () => {
		setup(
			{
				id: "w2",
				type: "numeric-input",
				data: { variable: "niveau", label: "Niveau", min: 0, max: 10 },
			} as unknown as HmiWidget,
			{ kind: "slider", params: { min: 20, max: 80 } },
		);

		const [min, max] = screen.getAllByRole("spinbutton");
		expect(min).toBeDisabled();
		expect(min).toHaveValue(20);
		expect(max).toBeDisabled();
		expect(max).toHaveValue(80);
	});

	it("grise le contact d'un interrupteur lié à un commutateur", () => {
		setup(
			{
				id: "w3",
				type: "toggle-switch",
				data: { variable: "sel", label: "Sélecteur", contact: "no" },
			} as unknown as HmiWidget,
			{ kind: "toggle-switch-nc", params: null },
		);

		const select = screen.getByRole("combobox");
		expect(select).toHaveAttribute("aria-disabled", "true");
		expect(select).toHaveTextContent("NF (0 en position actionnée)");
	});
});
