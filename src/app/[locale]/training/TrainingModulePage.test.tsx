/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import TrainingModulePage from "./TrainingModulePage";

const mockStepper = jest.fn();
jest.mock("./ModuleStepper", () => ({
	__esModule: true,
	default: (props: unknown) => {
		mockStepper(props);
		return <div data-testid="stepper" />;
	},
}));
jest.mock("./TrainingPageFooter", () => ({
	__esModule: true,
	default: () => <footer data-testid="footer" />,
}));

const steps = [
	{ id: "s1", kind: "theory" as const, title: "Étape", body: ["texte"] },
];

const setup = (props = {}) =>
	render(
		<TrainingModulePage
			title="Module A0"
			intro="Introduction du module"
			steps={steps}
			moduleId="a0"
			prevLabel="Précédent"
			nextLabel="Suivant"
			{...props}
		/>,
	);

describe("TrainingModulePage", () => {
	beforeEach(() => mockStepper.mockClear());

	it("affiche le titre en h1 et l'introduction", () => {
		setup();

		expect(
			screen.getByRole("heading", { level: 1, name: "Module A0" }),
		).toBeInTheDocument();
		expect(screen.getByText("Introduction du module")).toBeInTheDocument();
	});

	it("transmet ses propriétés au stepper", () => {
		const nextModule = { href: "/training/a1" as const, label: "Module suivant" };
		setup({ nextModule });

		expect(mockStepper).toHaveBeenCalledWith({
			steps,
			prevLabel: "Précédent",
			nextLabel: "Suivant",
			moduleId: "a0",
			nextModule,
		});
	});

	it("n'a pas de module suivant par défaut", () => {
		setup();

		expect(mockStepper.mock.calls[0][0].nextModule).toBeUndefined();
	});

	it("affiche les enfants entre le stepper et le pied de page", () => {
		setup({ children: <p>lien vers le manuel</p> });

		const order = [
			screen.getByTestId("stepper"),
			screen.getByText("lien vers le manuel"),
			screen.getByTestId("footer"),
		];
		for (let i = 0; i < order.length - 1; i++) {
			expect(
				order[i].compareDocumentPosition(order[i + 1]) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
	});

	it("affiche toujours le pied de page", () => {
		setup();

		expect(screen.getByTestId("footer")).toBeInTheDocument();
	});
});
