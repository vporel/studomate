/**
 * @jest-environment jsdom
 */
import { renderWithI18n } from "@tests/utils/i18n";
import { fireEvent, screen } from "@testing-library/react";
import { emptyAnalysisIssues } from "@/bridge/analysis-issues.mapper";
import SeveritySection from "./SeveritySection";

function baseProps(
	overrides: Partial<Parameters<typeof SeveritySection>[0]> = {},
) {
	return {
		title: "Erreurs",
		severity: "error" as const,
		issues: emptyAnalysisIssues(),
		hasProgramIssues: false,
		getGrafcetName: () => "",
		getGrafcetElementLabel: () => "",
		getLadderName: () => "",
		getLadderElementLabel: () => "",
		onGotoProgram: jest.fn(),
		...overrides,
	};
}

describe("SeveritySection", () => {
	function sectionBorderColor() {
		const section = screen.getByRole("heading", { level: 5 })
			.parentElement as HTMLElement;
		return getComputedStyle(section).borderLeftColor;
	}

	it("n'affiche plus de chevrons devant le titre", () => {
		renderWithI18n(<SeveritySection {...baseProps()} />);
		expect(screen.getByRole("heading", { level: 5 })).toHaveTextContent(
			/^Erreurs$/,
		);
	});

	it("colore le titre comme le trait quand il y a des issues, et le laisse par défaut sinon", () => {
		const issues = { ...emptyAnalysisIssues(), project: ["Message"] };
		const titleColor = () =>
			getComputedStyle(screen.getByRole("heading", { level: 5 })).color;
		const { unmount } = renderWithI18n(
			<SeveritySection {...baseProps({ issues })} />,
		);
		const withIssues = titleColor();
		unmount();
		renderWithI18n(<SeveritySection {...baseProps()} />);
		expect(titleColor()).not.toBe(withIssues);
	});

	it("utilise une couleur différente pour les avertissements et pour l'absence d'issue", () => {
		const issues = { ...emptyAnalysisIssues(), project: ["Message"] };
		const { unmount } = renderWithI18n(
			<SeveritySection {...baseProps({ severity: "error", issues })} />,
		);
		const errorColor = sectionBorderColor();
		unmount();
		const warning = renderWithI18n(
			<SeveritySection {...baseProps({ severity: "warning", issues })} />,
		);
		const warningColor = sectionBorderColor();
		warning.unmount();
		renderWithI18n(<SeveritySection {...baseProps()} />);
		const emptyColor = sectionBorderColor();
		expect(new Set([errorColor, warningColor, emptyColor]).size).toBe(3);
	});

	it("affiche 'Aucune erreur' pour la sévérité error sans aucune issue", () => {
		renderWithI18n(<SeveritySection {...baseProps({ severity: "error" })} />);
		expect(
			screen.getByText("Aucune erreur lors de l'analyse."),
		).toBeInTheDocument();
	});

	it("affiche 'Aucun avertissement' pour la sévérité warning sans aucune issue", () => {
		renderWithI18n(
			<SeveritySection
				{...baseProps({ severity: "warning", title: "Avertissements" })}
			/>,
		);
		expect(screen.getByText("Aucun avertissement.")).toBeInTheDocument();
	});

	it("affiche les issues globales au ladder, avec le nom du ladder résolu", () => {
		renderWithI18n(
			<SeveritySection
				{...baseProps({
					issues: {
						...emptyAnalysisIssues(),
						ladders: { l1: { overall: ["Section sans bobine"], elements: {} } },
					},
					hasProgramIssues: true,
					getLadderName: (id) => `Ladder ${id}`,
				})}
			/>,
		);
		expect(screen.getByText("Ladder : Ladder l1")).toBeInTheDocument();
		expect(screen.getByText("Section sans bobine")).toBeInTheDocument();
	});

	it("navigue vers le grafcet fautif au clic sur une issue d'élément grafcet", () => {
		const onGotoProgram = jest.fn();
		renderWithI18n(
			<SeveritySection
				{...baseProps({
					issues: {
						...emptyAnalysisIssues(),
						grafcets: {
							g1: { overall: [], elements: { "step-1": ["Étape orpheline"] } },
						},
					},
					hasProgramIssues: true,
					onGotoProgram,
				})}
			/>,
		);

		fireEvent.click(screen.getByText(/Étape orpheline/));

		expect(onGotoProgram).toHaveBeenCalledWith("g1", "grafcet", "step-1");
	});

	it("navigue vers le ladder fautif au clic sur une issue d'élément ladder", () => {
		const onGotoProgram = jest.fn();
		renderWithI18n(
			<SeveritySection
				{...baseProps({
					issues: {
						...emptyAnalysisIssues(),
						ladders: {
							l1: { overall: [], elements: { "coil-1": ["Bobine dupliquée"] } },
						},
					},
					hasProgramIssues: true,
					onGotoProgram,
				})}
			/>,
		);

		fireEvent.click(screen.getByText(/Bobine dupliquée/));

		expect(onGotoProgram).toHaveBeenCalledWith("l1", "ladder", "coil-1");
	});

	it("affiche les issues globales au projet sous un intitulé distinct", () => {
		renderWithI18n(
			<SeveritySection
				{...baseProps({
					issues: {
						...emptyAnalysisIssues(),
						project: ["Deux étapes portent le même numéro"],
					},
				})}
			/>,
		);
		expect(screen.getByText("Erreurs globales au projet")).toBeInTheDocument();
		expect(
			screen.getByText("Deux étapes portent le même numéro"),
		).toBeInTheDocument();
	});
});
