/**
 * @jest-environment jsdom
 */
import { setPreferredLocale } from "@/persistence/preferences.storage";
import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { render, screen, waitFor } from "@testing-library/react";
import StartupAside from "./StartupAside";

function renderAside() {
	render(
		<LocaleProvider>
			<StartupAside />
		</LocaleProvider>,
	);
}

describe("StartupAside", () => {
	beforeEach(() => localStorage.clear());

	it("ouvre le manuel et les formations français dans un nouvel onglet", () => {
		setPreferredLocale("fr");
		renderAside();
		const manual = screen.getByRole("link", { name: "Manuel utilisateur" });
		expect(manual).toHaveAttribute("href", "/fr/manuel-utilisateur");
		expect(manual).toHaveAttribute("target", "_blank");
		expect(screen.getByRole("link", { name: "Formations" })).toHaveAttribute(
			"href",
			"/fr/formations",
		);
	});

	it("pointe vers les pages anglaises quand l'app est en anglais", async () => {
		setPreferredLocale("en");
		renderAside();
		await waitFor(() =>
			expect(screen.getByRole("link", { name: "User manual" })).toHaveAttribute(
				"href",
				"/en/user-manual",
			),
		);
		expect(screen.getByRole("link", { name: "Training" })).toHaveAttribute(
			"href",
			"/en/training",
		);
	});
});
