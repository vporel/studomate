/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import ModuleIntro from "./ModuleIntro";
import ModuleIntroProvider, { useModuleIntro } from "./ModuleIntroContext";

function StepReporter({
	active,
	furthest,
}: {
	active: number;
	furthest: number;
}) {
	const intro = useModuleIntro();
	return (
		<button onClick={() => intro?.reportSteps(active, furthest)}>report</button>
	);
}

function setup(reported?: { active: number; furthest: number }) {
	render(
		<ModuleIntroProvider>
			<ModuleIntro label="Présentation et prérequis">
				<p>Texte de intro</p>
			</ModuleIntro>
			{reported && <StepReporter {...reported} />}
		</ModuleIntroProvider>,
	);
	if (reported) act(() => screen.getByText("report").click());
}

const detailsOf = () => screen.getByText("Texte de intro").closest("details")!;

describe("ModuleIntro", () => {
	it("is open under its label while no step has been passed", () => {
		setup();

		expect(detailsOf()).toHaveAttribute("open");
		expect(detailsOf()).toHaveTextContent("Présentation et prérequis");
	});

	it("is collapsed once a step has been passed, when back on the first step", () => {
		setup({ active: 0, furthest: 2 });

		expect(detailsOf()).not.toHaveAttribute("open");
	});

	it("keeps the choice of the user when the progression changes", () => {
		setup({ active: 0, furthest: 0 });
		act(() => {
			detailsOf().open = false;
			detailsOf().dispatchEvent(new Event("toggle"));
		});
		expect(detailsOf()).not.toHaveAttribute("open");

		act(() => screen.getByText("report").click());

		expect(detailsOf()).not.toHaveAttribute("open");
	});

	it("disappears once the stepper leaves the first step", () => {
		setup({ active: 1, furthest: 1 });

		expect(screen.queryByText("Texte de intro")).not.toBeInTheDocument();
	});

	it("is displayed without a provider", () => {
		render(
			<ModuleIntro label="Présentation et prérequis">
				<p>Texte de intro</p>
			</ModuleIntro>,
		);

		expect(screen.getByText("Texte de intro")).toBeInTheDocument();
	});
});
