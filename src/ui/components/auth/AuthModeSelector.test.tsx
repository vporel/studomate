/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import AuthModeSelector, { AuthMode } from "./AuthModeSelector";

function setup(mode: AuthMode) {
	const onSelect = jest.fn();
	render(
		<AuthModeSelector
			mode={mode}
			anonymousLabel="Pseudo"
			realLabel="Email"
			onSelect={onSelect}
		/>,
	);
	return { onSelect };
}

describe("AuthModeSelector", () => {
	it("met en avant le mode anonyme quand il est actif", () => {
		setup("anonymous");

		expect(screen.getByText("Pseudo")).toHaveClass("MuiButton-contained");
		expect(screen.getByText("Email")).toHaveClass("MuiButton-outlined");
	});

	it("met en avant le mode réel quand il est actif", () => {
		setup("real");

		expect(screen.getByText("Pseudo")).toHaveClass("MuiButton-outlined");
		expect(screen.getByText("Email")).toHaveClass("MuiButton-contained");
	});

	it("signale le mode choisi", () => {
		const { onSelect } = setup("anonymous");

		fireEvent.click(screen.getByText("Email"));
		fireEvent.click(screen.getByText("Pseudo"));

		expect(onSelect).toHaveBeenNthCalledWith(1, "real");
		expect(onSelect).toHaveBeenNthCalledWith(2, "anonymous");
	});
});
