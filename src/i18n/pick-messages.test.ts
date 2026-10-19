import { getMessages } from "@/i18n/messages";
import pickMessages from "./pick-messages";

const messages = getMessages("fr");

describe("pickMessages", () => {
	it("garde un namespace racine entier", () => {
		expect(pickMessages(messages, ["auth"])).toEqual({ auth: messages.auth });
	});

	it("garde un sous-namespace en conservant son imbrication, sans ses voisins", () => {
		const picked = pickMessages(messages, ["public.header"]);

		expect(picked).toEqual({ public: { header: messages.public.header } });
	});

	it("fusionne plusieurs sous-namespaces d'un même parent", () => {
		const picked = pickMessages(messages, ["public.header", "public.footer"]);

		expect(picked).toEqual({
			public: { header: messages.public.header, footer: messages.public.footer },
		});
	});

	it("ignore un namespace absent", () => {
		expect(
			pickMessages(messages, ["missing.namespace" as "auth"]),
		).toEqual({});
	});

	it("ne retient pas les namespaces non demandés", () => {
		const picked = pickMessages(messages, ["profile"]);

		expect(Object.keys(picked)).toEqual(["profile"]);
	});
});
