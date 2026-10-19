/**
 * @jest-environment jsdom
 */
import { screen, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import { APP_NAME, APP_REPO_URL } from "@/app-info";
import messages from "@/i18n/messages/fr/public.json";
import LandingPage from "./LandingPage";

describe("LandingPage", () => {
	beforeEach(() => {
		jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
	});

	afterEach(() => jest.restoreAllMocks());

	it("propose au moins un CTA vers /app", () => {
		renderWithI18n(<LandingPage />);
		const appLinks = screen
			.getAllByRole("link")
			.filter((el) => el.getAttribute("href") === "/app");
		expect(appLinks.length).toBeGreaterThan(0);
	});

	it("porte la proposition de valeur dans le h1, le nom de marque en simple surtitre", () => {
		renderWithI18n(<LandingPage />);
		const h1 = screen.getByRole("heading", { level: 1 });

		expect(h1).toHaveTextContent("Apprenez le GRAFCETet le Ladder en simulant");
		expect(h1).not.toHaveTextContent(APP_NAME);
		expect(h1.querySelectorAll("br")).toHaveLength(1);
		const eyebrow = screen.getByText(APP_NAME, { selector: "p" });
		expect(eyebrow.closest("h1, h2, h3")).toBeNull();
		expect(screen.queryByText(messages.footer.slogan)).not.toBeInTheDocument();
	});

	it("propose la formation comme second appel à l'action du hero", () => {
		renderWithI18n(<LandingPage />);

		expect(
			screen.getByRole("link", { name: messages.landing.followTraining }),
		).toHaveAttribute("href", "/formations");
	});

	it("rend le sous-titre du hero comme un paragraphe, pas comme un titre", () => {
		renderWithI18n(<LandingPage />);
		const tagline = screen.getByText(messages.landing.heroTagline);

		expect(tagline.tagName).toBe("P");
		expect(tagline.closest("h1, h2, h3, h4, h5, h6")).toBeNull();
	});

	it("présente chaque notation, la scène 3D et l'Arduino avec un titre, un texte et un visuel", () => {
		renderWithI18n(<LandingPage />);
		const { landing } = messages;

		for (const key of [
			"showcaseGrafcet",
			"showcaseLadder",
			"showcaseHmi",
			"showcaseScene3d",
			"showcaseArduino",
		] as const) {
			expect(
				screen.getByRole("heading", {
					name: landing[`${key}Title`],
					level: 3,
				}),
			).toBeInTheDocument();
			expect(screen.getByText(landing[`${key}Text`])).toBeInTheDocument();
			expect(
				screen.getByRole("img", {
					name: landing[`${key}Alt`],
				}),
			).toBeInTheDocument();
		}
	});

	it("charge en différé toutes les images situées sous le hero", () => {
		renderWithI18n(<LandingPage />);
		const images = screen
			.getAllByRole("img")
			.filter((element) => element.tagName === "IMG");

		expect(images.length).toBeGreaterThan(0);
		for (const img of images) {
			expect(img).toHaveAttribute("loading", "lazy");
		}
	});

	it("illustre les cartes d'exemples par la même vue (l'HMI) pour pouvoir les comparer", () => {
		renderWithI18n(<LandingPage />);
		const previews = screen.getAllByRole("img", { name: /^aperçu du projet/i });

		expect(previews.length).toBeGreaterThan(1);
		for (const img of previews) {
			expect(img.getAttribute("src")).toMatch(/_hmi\./);
		}
	});

	it("répartit la vitrine entre la logique (GRAFCET, Ladder) et la machine (HMI, 3D, Arduino)", () => {
		renderWithI18n(<LandingPage />);
		const { landing } = messages;
		const rowTitles = (sectionTitle: string) =>
			within(
				screen
					.getByRole("heading", { name: sectionTitle, level: 2 })
					.closest("section")!,
			)
				.getAllByRole("heading", { level: 3 })
				.map((h) => h.textContent);

		expect(rowTitles(landing.logicTitle)).toEqual([
			landing.showcaseGrafcetTitle,
			landing.showcaseLadderTitle,
		]);
		expect(rowTitles(landing.machineTitle)).toEqual([
			landing.showcaseHmiTitle,
			landing.showcaseScene3dTitle,
			landing.showcaseArduinoTitle,
		]);
	});

	it("sépare les sections par leur fond, sans séparateur ni carrousel", () => {
		renderWithI18n(<LandingPage />);

		expect(screen.queryByRole("separator")).not.toBeInTheDocument();
		expect(
			document.querySelector('[aria-roledescription="carrousel"]'),
		).toBeNull();
	});

	it("a une hiérarchie de titres sans saut : un h1, des h2 de section, des h3 de carte", () => {
		renderWithI18n(<LandingPage />);
		const levels = screen
			.getAllByRole("heading")
			.map((h) => Number(h.tagName.slice(1)));

		expect(levels.filter((l) => l === 1)).toHaveLength(1);
		expect(levels.filter((l) => l === 3).length).toBeGreaterThan(0);
		expect(Math.max(...levels)).toBe(3);
		expect(
			screen.getByRole("heading", { name: /friction zéro/i, level: 3 }),
		).toBeInTheDocument();
	});

	it("renvoie vers chaque module de formation et vers la liste des formations", () => {
		renderWithI18n(<LandingPage />);

		for (const id of ["a0", "a1", "a2", "a3", "a4"]) {
			expect(
				screen.getByRole("link", {
					name: new RegExp(`^Module ${id.toUpperCase()} :`),
				}),
			).toHaveAttribute("href", `/formations/${id}`);
		}
		expect(
			screen.getByRole("link", { name: /voir toutes les formations/i }),
		).toHaveAttribute("href", "/formations");
	});

	it("présente chaque module de formation en carte : notation abordée, titre et résumé", () => {
		renderWithI18n(<LandingPage />);
		const landing = messages.landing as Record<string, string>;

		for (const id of ["A0", "A1", "A2", "A3", "A4"]) {
			const title = screen.getByRole("heading", {
				name: new RegExp(`^Module ${id} :`),
				level: 3,
			});
			const card = title.closest("li")!;
			expect(
				within(card).getByText(landing[`training${id}Topic`]),
			).toBeInTheDocument();
			expect(
				within(card).getByText(landing[`training${id}Summary`]),
			).toBeInTheDocument();
		}
	});

	it("renvoie vers le dépôt GitHub", () => {
		renderWithI18n(<LandingPage />);
		expect(
			screen.getByRole("link", { name: /voir sur github/i }),
		).toHaveAttribute("href", APP_REPO_URL);
	});

	it("affiche la section des exemples", () => {
		renderWithI18n(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /des exemples pour démarrer/i }),
		).toBeInTheDocument();
	});

	it("met en avant le positionnement tout-en-un et la friction zéro", () => {
		renderWithI18n(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /pourquoi studomate/i }),
		).toBeInTheDocument();
		expect(screen.getByText(/friction zéro/i)).toBeInTheDocument();
		expect(screen.getByText(/tout-en-un/i)).toBeInTheDocument();
	});

	it("affiche l'argument de pérennité et la licence AGPL", () => {
		renderWithI18n(<LandingPage />);
		expect(
			screen.getByRole("heading", { name: /vos projets vous appartiennent/i }),
		).toBeInTheDocument();
		expect(screen.getAllByText(/AGPL v3/i).length).toBeGreaterThan(0);
		expect(screen.queryByText(/licence MIT/i)).not.toBeInTheDocument();
	});

	it("regroupe pérennité, vie privée et lien GitHub dans une seule section de confiance", () => {
		renderWithI18n(<LandingPage />);
		const trustTitle = screen.getByRole("heading", {
			name: /vos projets vous appartiennent/i,
			level: 2,
		});
		const section = trustTitle.closest("section")!;

		expect(within(section).getAllByRole("heading", { level: 3 })).toHaveLength(
			3,
		);
		expect(
			within(section).getByRole("heading", {
				name: /pensé pour la vie privée/i,
			}),
		).toBeInTheDocument();
		expect(
			within(section).getByRole("link", { name: /voir sur github/i }),
		).toHaveAttribute("href", APP_REPO_URL);
		expect(
			screen.queryByRole("heading", { name: /^open source$/i }),
		).not.toBeInTheDocument();
	});

	it("affiche les publics visés en pastilles dans la section « Pourquoi », sans section dédiée", () => {
		renderWithI18n(<LandingPage />);
		const whySection = screen
			.getByRole("heading", { name: /pourquoi studomate/i })
			.closest("section")!;

		for (const key of [
			"audienceStudents",
			"audienceTeachers",
			"audienceProfessionals",
		] as const) {
			expect(
				within(whySection).getByText(messages.landing[key]),
			).toBeInTheDocument();
		}
		expect(
			screen.queryByRole("heading", { name: /pour qui/i }),
		).not.toBeInTheDocument();
	});

	it("montre la démo puis la vitrine du produit juste après le hero et termine sur l'appel à ouvrir l'application", () => {
		renderWithI18n(<LandingPage />);
		const sectionTitles = screen
			.getAllByRole("heading", { level: 2 })
			.map((h) => h.textContent);

		expect(sectionTitles[0]).toBe(
			messages.landing.demoTitle,
		);
		expect(sectionTitles[1]).toBe(messages.landing.logicTitle);
		expect(sectionTitles[2]).toBe(messages.landing.machineTitle);
		expect(sectionTitles.at(-1)).toBe(messages.landing.stepsTitle);
		const lastSection = screen
			.getByRole("heading", { name: messages.landing.stepsTitle })
			.closest("section")!;
		expect(
			within(lastSection).getByRole("link", { name: /ouvrir l'application/i }),
		).toHaveAttribute("href", "/app");
	});

	describe("grilles de cartes", () => {
		const cardKeys = [
			"reasonFriction",
			"reasonAllInOne",
			"reasonShortLoop",
			"featureSimulation",
			"featureManual",
			"featureCloud",
			"durabilityNoLockIn",
			"durabilityIndependence",
			"privacy",
		] as const;

		it.each(cardKeys)(
			"affiche la carte %s avec son titre et son texte",
			(key) => {
				const landing = messages.landing as Record<string, string>;
				renderWithI18n(<LandingPage />);

				expect(
					screen.getByRole("heading", { name: landing[`${key}Title`] }),
				).toBeInTheDocument();
				expect(screen.getByText(landing[`${key}Text`])).toBeInTheDocument();
			},
		);
	});
});
