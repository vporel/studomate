/**
 * @jest-environment jsdom
 */
import { act, render, screen } from "@testing-library/react";
import MobileGuard from "./MobileGuard";

function setWidth(width: number) {
	Object.defineProperty(window, "innerWidth", {
		configurable: true,
		writable: true,
		value: width,
	});
}

const LOCALE_STORAGE_KEY = "studomate_locale";

describe("MobileGuard", () => {
	beforeEach(() => localStorage.clear());

	it("laisse passer l'application sur un écran de bureau", () => {
		setWidth(1280);
		render(
			<MobileGuard>
				<p>contenu</p>
			</MobileGuard>,
		);
		expect(screen.getByText("contenu")).toBeInTheDocument();
	});

	it("remplace l'application par le message desktop sous 768 px, dans la langue préférée", () => {
		localStorage.setItem(LOCALE_STORAGE_KEY, "fr");
		setWidth(500);
		render(
			<MobileGuard>
				<p>contenu</p>
			</MobileGuard>,
		);
		expect(screen.queryByText("contenu")).not.toBeInTheDocument();
		expect(
			screen.getByText("Application desktop uniquement"),
		).toBeInTheDocument();
	});

	it("affiche le message dans la langue préférée de l'utilisateur", () => {
		localStorage.setItem(LOCALE_STORAGE_KEY, "en");
		setWidth(500);
		render(
			<MobileGuard>
				<p>contenu</p>
			</MobileGuard>,
		);
		expect(screen.getByText("Desktop application only")).toBeInTheDocument();
	});

	it("bascule au redimensionnement de la fenêtre", () => {
		setWidth(1280);
		render(
			<MobileGuard>
				<p>contenu</p>
			</MobileGuard>,
		);
		act(() => {
			setWidth(600);
			window.dispatchEvent(new Event("resize"));
		});
		expect(screen.queryByText("contenu")).not.toBeInTheDocument();
		act(() => {
			setWidth(900);
			window.dispatchEvent(new Event("resize"));
		});
		expect(screen.getByText("contenu")).toBeInTheDocument();
	});
});
