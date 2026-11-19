/**
 * @jest-environment jsdom
 */
import { APP_CONTACT_EMAIL } from "@/app-info";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderWithI18n } from "@tests/utils/i18n";
import ContactForm from "./ContactForm";

const fetchMock = jest.fn();

const messageField = () => screen.getByLabelText(/^Message/);
const fill = (label: RegExp, value: string) =>
	fireEvent.change(screen.getByLabelText(label), { target: { value } });
const chooseTopic = (label: string) => {
	fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sujet" }));
	fireEvent.click(
		within(screen.getByRole("listbox")).getByRole("option", { name: label }),
	);
};
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body);

describe("ContactForm", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		fetchMock.mockResolvedValue({ ok: true, status: 200 });
		global.fetch = fetchMock;
	});

	it("starts on a usage question with an empty message", () => {
		renderWithI18n(<ContactForm initialTopic={null} />);

		expect(screen.getByRole("combobox", { name: "Sujet" })).toHaveTextContent(
			"Question sur l'utilisation",
		);
		expect(messageField()).toHaveValue("");
	});

	it("preselects the given topic and starts the message from its template", () => {
		renderWithI18n(<ContactForm initialTopic="forgotten-password" />);

		expect(screen.getByRole("combobox", { name: "Sujet" })).toHaveTextContent(
			"Mot de passe oublié, accès au compte",
		);
		expect((messageField() as HTMLTextAreaElement).value).toContain(
			"Mon pseudo : ",
		);
	});

	it("replaces an untouched template when the topic changes, not a written message", () => {
		renderWithI18n(<ContactForm initialTopic="forgotten-password" />);

		chooseTopic("Signaler un problème");
		expect((messageField() as HTMLTextAreaElement).value).toContain(
			"Étapes pour le reproduire",
		);

		fill(/^Message/, "Mon propre message, déjà écrit.");
		chooseTopic("Autre");
		expect(messageField()).toHaveValue("Mon propre message, déjà écrit.");
	});

	it("checks the email and the message before sending", () => {
		renderWithI18n(<ContactForm initialTopic={null} />);

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		expect(screen.getByText("Adresse email invalide.")).toBeInTheDocument();
		expect(
			screen.getByText("Le message doit contenir au moins 10 caractères."),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	describe("forgotten password", () => {
		const template = () => (messageField() as HTMLTextAreaElement).value;

		it("asks for the username when nothing follows « Mon pseudo : »", () => {
			renderWithI18n(<ContactForm initialTopic="forgotten-password" />);
			fill(/^Votre email/, "eleve@lycee.fr");

			fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

			expect(
				screen.getByText("Indiquez votre pseudo après « Mon pseudo : »."),
			).toBeInTheDocument();
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it("asks for the username when its line was removed", () => {
			renderWithI18n(<ContactForm initialTopic="forgotten-password" />);
			fill(/^Votre email/, "eleve@lycee.fr");
			fill(/^Message/, "Bonjour, j'ai oublié mon mot de passe.");

			fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

			expect(
				screen.getByText("Indiquez votre pseudo après « Mon pseudo : »."),
			).toBeInTheDocument();
		});

		it("sends the message once the username is given", async () => {
			renderWithI18n(<ContactForm initialTopic="forgotten-password" />);
			fill(/^Votre email/, "eleve@lycee.fr");
			fill(/^Message/, `${template()}alex_42`);

			fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

			await waitFor(() => expect(fetchMock).toHaveBeenCalled());
			expect(sentBody().message).toContain("Mon pseudo : alex_42");
		});
	});

	it("refuses a problem report whose template was left untouched", () => {
		renderWithI18n(<ContactForm initialTopic="problem" />);
		fill(/^Votre email/, "eleve@lycee.fr");

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		expect(
			screen.getByText("Complétez le message avant de l'envoyer."),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sends the message and confirms it", async () => {
		renderWithI18n(<ContactForm initialTopic={null} />);
		fill(/^Votre email/, "eleve@lycee.fr");
		fill(/^Votre nom/, "Alex");
		fill(/^Message/, "Comment ajouter une étape initiale ?");

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		expect(
			await screen.findByText(
				"Message envoyé. Vous recevrez une réponse par email.",
			),
		).toBeInTheDocument();
		expect(fetchMock.mock.calls[0][0]).toBe("/api/contact");
		expect(sentBody()).toMatchObject({
			topic: "question",
			email: "eleve@lycee.fr",
			name: "Alex",
			message: "Comment ajouter une étape initiale ?",
			locale: "fr",
			website: "",
		});
		expect(sentBody().userAgent).toBeUndefined();
	});

	it("attaches the browser to a problem report and says so", async () => {
		renderWithI18n(<ContactForm initialTopic="problem" />);
		expect(
			screen.getByText(/Le nom et la version de votre navigateur/),
		).toBeInTheDocument();
		fill(/^Votre email/, "eleve@lycee.fr");
		fill(/^Message/, "La simulation ne démarre pas.");

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalled());
		expect(sentBody().userAgent).toBe(navigator.userAgent);
	});

	it("explains a refusal for too many messages", async () => {
		fetchMock.mockResolvedValue({ ok: false, status: 429 });
		renderWithI18n(<ContactForm initialTopic={null} />);
		fill(/^Votre email/, "eleve@lycee.fr");
		fill(/^Message/, "Comment ajouter une étape initiale ?");

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		expect(
			await screen.findByText(/Trop de messages envoyés/),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: APP_CONTACT_EMAIL }),
		).toHaveAttribute("href", `mailto:${APP_CONTACT_EMAIL}`);
	});

	it("offers the email address when sending fails", async () => {
		fetchMock.mockRejectedValue(new Error("network"));
		renderWithI18n(<ContactForm initialTopic={null} />);
		fill(/^Votre email/, "eleve@lycee.fr");
		fill(/^Message/, "Comment ajouter une étape initiale ?");

		fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

		const alert = await screen.findByText(/n'a pas pu être envoyé/);
		expect(
			within(alert).getByRole("link", { name: APP_CONTACT_EMAIL }),
		).toHaveAttribute("href", `mailto:${APP_CONTACT_EMAIL}`);
		expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();
	});
});
