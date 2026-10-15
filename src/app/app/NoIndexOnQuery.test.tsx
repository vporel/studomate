/**
 * @jest-environment jsdom
 */
import { render } from "@testing-library/react";
import NoIndexOnQuery from "./NoIndexOnQuery";

const robotsMeta = () => document.head.querySelector('meta[name="robots"]');

describe("NoIndexOnQuery", () => {
	afterEach(() => window.history.replaceState(null, "", "/"));

	it("n'ajoute rien sur /app sans paramètre", () => {
		window.history.replaceState(null, "", "/app");
		render(<NoIndexOnQuery />);
		expect(robotsMeta()).toBeNull();
	});

	it("ajoute noindex quand l'URL porte des paramètres, et le retire au démontage", () => {
		window.history.replaceState(null, "", "/app?share=abc");
		const { unmount } = render(<NoIndexOnQuery />);
		expect(robotsMeta()).toHaveAttribute("content", "noindex");
		unmount();
		expect(robotsMeta()).toBeNull();
	});
});
