/** @jest-environment jsdom */
import { HmiWidget } from "@/schemas/hmi/hmi-widget.schema";
import { useHmiStore } from "@/ui/components/hmi/HmiContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { selectorImplementation } from "@tests/utils/store-mocks";
import HmiWidgetAnimationsPane from "./HmiWidgetAnimationsPane";

jest.mock("@/ui/components/hmi/HmiContext");
jest.mock("@/ui/components/projects/ProjectContext");
jest.mock("@/ui/components/variables/VariableSelector", () => ({
	__esModule: true,
	default: ({
		label,
		value,
		onCommit,
	}: {
		label: string;
		value: string;
		onCommit: (m: string) => void;
	}) => (
		<input
			aria-label={label}
			defaultValue={value}
			onBlur={(e) => onCommit(e.target.value)}
		/>
	),
}));

const nativeTypes: Record<string, string> = { bool: "boolean", num: "number" };

const STATIC = { fill: "#111111", stroke: "#222222" };

const rectangle = (animations?: object) =>
	({
		id: "w1",
		type: "rectangle",
		name: "Rect",
		data: { style: { ...STATIC }, ...(animations ? { animations } : {}) },
	}) as unknown as HmiWidget;

const pushButton = (animations?: object) =>
	({
		id: "w2",
		type: "push-button",
		name: "Bouton",
		data: { ...(animations ? { animations } : {}) },
	}) as unknown as HmiWidget;

function setup(widget: HmiWidget, readOnly = false, visible = true) {
	const updateWidget = jest.fn();
	const closeAnimationsPane = jest.fn();
	(useHmiStore as jest.Mock).mockImplementation(
		selectorImplementation({
			updateWidget,
			animationsPaneVisible: visible,
			closeAnimationsPane,
		}),
	);
	(useProjectStore as unknown as jest.Mock).mockImplementation(
		selectorImplementation({
			project: {
				findVariableByMnemonic: (m: string) =>
					nativeTypes[m] ? { getNativeType: () => nativeTypes[m] } : undefined,
			},
		}),
	);
	renderWithI18n(
		<HmiWidgetAnimationsPane widget={widget} readOnly={readOnly} />,
	);
	return { updateWidget, closeAnimationsPane };
}

const commit = (label: string, value: string) => {
	const input = screen.getByLabelText(label);
	fireEvent.change(input, { target: { value } });
	fireEvent.blur(input);
};

const openStyleTab = () =>
	fireEvent.click(screen.getByRole("tab", { name: "Style" }));

describe("HmiWidgetAnimationsPane", () => {
	it("n'affiche rien tant que le volet n'est pas ouvert", () => {
		setup(rectangle(), false, false);

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("est intitulé par le nom du widget et se ferme par le bouton de fermeture", () => {
		const { closeAnimationsPane } = setup(rectangle());

		expect(screen.getByRole("dialog")).toHaveTextContent("Rect");
		fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
		expect(closeAnimationsPane).toHaveBeenCalledTimes(1);
	});

	it("rend le contenu inerte en lecture seule", () => {
		setup(rectangle(), true);

		expect(
			screen.getByLabelText("Décalage X").closest("[inert]"),
		).not.toBeNull();
	});

	it("n'est pas inerte hors lecture seule", () => {
		setup(rectangle());

		expect(screen.getByLabelText("Décalage X").closest("[inert]")).toBeNull();
	});

	describe("onglet Position", () => {
		it("est affiché par défaut avec les variables existantes", () => {
			setup(rectangle({ position: { xVariable: "dx", yVariable: "dy" } }));

			expect(screen.getByLabelText("Décalage X")).toHaveValue("dx");
			expect(screen.getByLabelText("Décalage Y")).toHaveValue("dy");
		});

		it("n'affiche pas l'onglet Style pour un widget sans propriété animable", () => {
			setup(pushButton());

			expect(screen.getByRole("tab", { name: "Position" })).toBeInTheDocument();
			expect(
				screen.queryByRole("tab", { name: "Style" }),
			).not.toBeInTheDocument();
		});

		it("enregistre la variable de décalage X en conservant Y", () => {
			const { updateWidget } = setup(
				rectangle({ position: { yVariable: "dy" } }),
			);

			commit("Décalage X", "dx");

			expect(updateWidget).toHaveBeenCalledWith("w1", {
				data: {
					style: STATIC,
					animations: { position: { yVariable: "dy", xVariable: "dx" } },
				},
			});
		});

		it("enregistre la variable de décalage Y sur un widget sans animations", () => {
			const { updateWidget } = setup(pushButton());

			commit("Décalage Y", "dy");

			expect(updateWidget).toHaveBeenCalledWith("w2", {
				data: { animations: { position: { yVariable: "dy" } } },
			});
		});

		it("réinitialise les deux variables", () => {
			const { updateWidget } = setup(
				rectangle({ position: { xVariable: "dx", yVariable: "dy" } }),
			);

			fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

			expect(updateWidget.mock.calls[0][1].data.animations.position).toEqual({
				xVariable: "",
				yVariable: "",
			});
		});
	});

	describe("onglet Style", () => {
		const numericStyle = {
			style: {
				variable: "num",
				rows: [
					{ value: 0, properties: { fill: "#aaaaaa" } },
					{ value: 5, properties: { fill: "#bbbbbb", stroke: "#cccccc" } },
				],
			},
		};
		const boolStyle = {
			style: {
				variable: "bool",
				rows: [
					{ value: 0, properties: { fill: "#aaaaaa", stroke: "#a1a1a1" } },
					{ value: 1, properties: { fill: "#bbbbbb", stroke: "#b1b1b1" } },
				],
			},
		};

		it("n'affiche pas de table sans animation de style", () => {
			setup(rectangle());
			openStyleTab();

			expect(screen.queryByRole("table")).not.toBeInTheDocument();
			expect(screen.getByLabelText("Variable")).toHaveValue("");
		});

		it("affiche une ligne par valeur, avec repli sur la valeur statique", () => {
			setup(rectangle(numericStyle));
			openStyleTab();

			const rows = within(screen.getByRole("table")).getAllByRole("row");
			expect(rows).toHaveLength(3);
			expect(
				(rows[1].querySelectorAll("input")[0] as HTMLInputElement).value,
			).toBe("0");
			expect(
				(rows[1].querySelectorAll("input")[1] as HTMLInputElement).value,
			).toBe("#aaaaaa");
			expect(
				(rows[1].querySelectorAll("input")[2] as HTMLInputElement).value,
			).toBe(STATIC.stroke);
		});

		it("variable booléenne : valeurs affichées en lecture, sans ajout ni suppression", () => {
			setup(rectangle(boolStyle));
			openStyleTab();

			const rows = within(screen.getByRole("table")).getAllByRole("row");
			expect(rows).toHaveLength(3);
			expect(
				screen.queryByRole("button", { name: "Ajouter une ligne" }),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", { name: "Supprimer la ligne" }),
			).not.toBeInTheDocument();
			expect(rows[1].querySelectorAll("input[type=number]")).toHaveLength(0);
			expect(rows[2]).toHaveTextContent("1");
		});

		it("variable numérique : propose l'ajout et la suppression", () => {
			setup(rectangle(numericStyle));
			openStyleTab();

			expect(
				screen.getByRole("button", { name: "Ajouter une ligne" }),
			).toBeInTheDocument();
			expect(
				screen.getAllByRole("button", { name: "Supprimer la ligne" }),
			).toHaveLength(2);
		});

		it("ajoute une ligne à la valeur max + 1 avec les valeurs statiques", () => {
			const { updateWidget } = setup(rectangle(numericStyle));
			openStyleTab();

			fireEvent.click(
				screen.getByRole("button", { name: "Ajouter une ligne" }),
			);

			const rows = updateWidget.mock.calls[0][1].data.animations.style.rows;
			expect(rows).toHaveLength(3);
			expect(rows[2]).toEqual({ value: 6, properties: STATIC });
		});

		it("supprime la ligne choisie", () => {
			const { updateWidget } = setup(rectangle(numericStyle));
			openStyleTab();

			fireEvent.click(
				screen.getAllByRole("button", { name: "Supprimer la ligne" })[0],
			);

			expect(updateWidget.mock.calls[0][1].data.animations.style.rows).toEqual([
				numericStyle.style.rows[1],
			]);
		});

		it("modifie la valeur d'une ligne en nombre", () => {
			const { updateWidget } = setup(rectangle(numericStyle));
			openStyleTab();

			const input = screen
				.getByRole("table")
				.querySelectorAll("tbody tr")[1]
				.querySelector("input[type=number]") as HTMLInputElement;
			fireEvent.change(input, { target: { value: "12" } });

			const rows = updateWidget.mock.calls[0][1].data.animations.style.rows;
			expect(rows[1].value).toBe(12);
			expect(rows[0]).toEqual(numericStyle.style.rows[0]);
		});

		it("modifie une propriété d'une ligne sans toucher aux autres", () => {
			const { updateWidget } = setup(rectangle(numericStyle));
			openStyleTab();

			const input = screen
				.getByRole("table")
				.querySelectorAll("tbody tr")[0]
				.querySelectorAll("input")[2] as HTMLInputElement;
			fireEvent.change(input, { target: { value: "#123456" } });

			const rows = updateWidget.mock.calls[0][1].data.animations.style.rows;
			expect(rows[0].properties).toEqual({
				fill: "#aaaaaa",
				stroke: "#123456",
			});
			expect(rows[1]).toEqual(numericStyle.style.rows[1]);
		});

		it("choisir une variable booléenne crée deux lignes 0/1 aux valeurs statiques", () => {
			const { updateWidget } = setup(rectangle());
			openStyleTab();

			commit("Variable", "bool");

			expect(updateWidget.mock.calls[0][1].data.animations.style).toEqual({
				variable: "bool",
				rows: [
					{ value: 0, properties: STATIC },
					{ value: 1, properties: STATIC },
				],
			});
		});

		it("passer à une variable booléenne garde les deux premières lignes, forcées à 0/1", () => {
			const { updateWidget } = setup(
				rectangle({
					style: {
						variable: "num",
						rows: [
							{ value: 3, properties: { fill: "#1" } },
							{ value: 7, properties: { fill: "#2" } },
							{ value: 9, properties: { fill: "#3" } },
						],
					},
				}),
			);
			openStyleTab();

			commit("Variable", "bool");

			expect(updateWidget.mock.calls[0][1].data.animations.style.rows).toEqual([
				{ value: 0, properties: { fill: "#1" } },
				{ value: 1, properties: { fill: "#2" } },
			]);
		});

		it("choisir une variable numérique sans ligne crée une ligne de valeur 0", () => {
			const { updateWidget } = setup(rectangle());
			openStyleTab();

			commit("Variable", "num");

			expect(updateWidget.mock.calls[0][1].data.animations.style).toEqual({
				variable: "num",
				rows: [{ value: 0, properties: STATIC }],
			});
		});

		it("passer à une variable numérique conserve les lignes existantes", () => {
			const { updateWidget } = setup(rectangle(boolStyle));
			openStyleTab();

			commit("Variable", "num");

			expect(updateWidget.mock.calls[0][1].data.animations.style).toEqual({
				variable: "num",
				rows: boolStyle.style.rows,
			});
		});

		it("réinitialise l'animation de style en conservant la position", () => {
			const { updateWidget } = setup(
				rectangle({ ...numericStyle, position: { xVariable: "dx" } }),
			);
			openStyleTab();

			fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

			expect(updateWidget.mock.calls[0][1].data.animations).toEqual({
				position: { xVariable: "dx" },
				style: undefined,
			});
		});
	});
});
