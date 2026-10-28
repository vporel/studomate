/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import GlossaryBrowser from "./GlossaryBrowser";
import type { GlossaryEntryView, GlossarySectionView } from "./glossary-view";

const labels = {
	searchLabel: "Rechercher",
	searchPlaceholder: "",
	filterLabel: "Filtrer",
	filterAll: "Tout",
	noResults: "Aucun résultat",
	aliasesLabel: "Aussi appelé",
	relatedLabel: "Voir aussi",
	resultsOne: "1 terme",
	resultsOther: "{count} termes",
};

const sections: GlossarySectionView[] = [
	{ id: "grafcet", title: "GRAFCET" },
	{ id: "ladder", title: "Ladder" },
];

const entry = (
	id: string,
	section: GlossaryEntryView["section"],
	term: string,
	extra: Partial<GlossaryEntryView> = {},
): GlossaryEntryView => ({
	id,
	section,
	term,
	aliases: [],
	definition: `def ${term}`,
	definitionHtml: `<p>def ${term}</p>`,
	detailsHtml: "",
	searchText: "",
	related: [],
	...extra,
});

const withSearchText = (e: GlossaryEntryView): GlossaryEntryView => ({
	...e,
	searchText: e.term.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(),
});

const entries = [
	entry("step", "grafcet", "Étape", {
		aliases: ["carré numéroté"],
		related: [{ id: "contact", term: "Contact" }],
		figure: {
			src: "/glossary/grafcet/step.svg",
			alt: "Trois étapes",
			width: 380,
		},
	}),
	entry("transition", "grafcet", "Transition"),
	entry("contact", "ladder", "Contact"),
].map(withSearchText);

const renderBrowser = () =>
	render(
		<GlossaryBrowser sections={sections} entries={entries} labels={labels} />,
	);

const search = (value: string) =>
	fireEvent.change(screen.getByLabelText("Rechercher"), { target: { value } });

describe("GlossaryBrowser", () => {
	it("affiche une liste continue de cartes, sans titre de section", () => {
		renderBrowser();
		const heading = screen.getByRole("heading", { level: 2, name: "Étape" });
		expect(heading.closest("article")?.id).toBe("step");
		expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
		expect(screen.getByRole("status").textContent).toBe("3 termes");
	});

	it("affiche la notation de chaque carte sur la ligne de son titre", () => {
		renderBrowser();
		const header = screen.getByRole("heading", {
			name: "Contact",
		}).parentElement!;
		expect(header.textContent).toContain("Ladder");
		const stepHeader = screen.getByRole("heading", {
			name: "Étape",
		}).parentElement!;
		expect(stepHeader.textContent).toContain("GRAFCET");
	});

	it("affiche alias, figure et liens vers les termes liés", () => {
		renderBrowser();
		expect(screen.getByText(/carré numéroté/)).toBeTruthy();
		expect(screen.getByRole("img", { name: "Trois étapes" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
		).toBe("#contact");
	});

	it("filtre sans tenir compte des accents ni de la casse", () => {
		renderBrowser();
		search("ETAPE");
		expect(screen.getByRole("heading", { name: "Étape" })).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Contact" })).toBeNull();
		expect(screen.getByRole("status").textContent).toBe("1 terme");
	});

	it("ne cherche que dans les titres, pas dans les alias", () => {
		renderBrowser();
		search("carre");
		expect(screen.getByText("Aucun résultat")).toBeTruthy();
	});

	it("garde les cartes restantes dans l'ordre reçu", () => {
		renderBrowser();
		search("t");
		const titles = screen
			.getAllByRole("heading", { level: 2 })
			.map((h) => h.textContent);
		expect(titles).toEqual(["Étape", "Transition", "Contact"]);
	});

	it("indique l'absence de résultat", () => {
		renderBrowser();
		search("zzz");
		expect(screen.getByText("Aucun résultat")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe("0 termes");
	});

	it("filtre par notation avec les puces, combinable à la recherche", () => {
		renderBrowser();
		fireEvent.click(screen.getByRole("button", { name: "Ladder" }));
		expect(screen.queryByRole("heading", { name: "Étape" })).toBeNull();
		expect(screen.getByRole("heading", { name: "Contact" })).toBeTruthy();
		expect(
			screen
				.getByRole("button", { name: "Ladder" })
				.getAttribute("aria-pressed"),
		).toBe("true");
		search("etape");
		expect(screen.getByText("Aucun résultat")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Tout" }));
		expect(screen.getByRole("heading", { name: "Étape" })).toBeTruthy();
	});
});
