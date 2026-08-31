/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import ErrorPage from "./error";

const captureException = jest.fn();
jest.mock("@sentry/nextjs", () => ({
	captureException: (...args: unknown[]) => captureException(...args),
}));

beforeEach(() => {
	captureException.mockClear();
});

it("remonte l'erreur à Sentry au montage", () => {
	const error = new Error("boom");
	render(<ErrorPage error={error} reset={jest.fn()} />);
	expect(captureException).toHaveBeenCalledWith(error);
});

it("déclenche reset au clic sur Recharger", () => {
	const reset = jest.fn();
	render(<ErrorPage error={new Error("boom")} reset={reset} />);
	fireEvent.click(screen.getByRole("button", { name: "Recharger" }));
	expect(reset).toHaveBeenCalledTimes(1);
});
