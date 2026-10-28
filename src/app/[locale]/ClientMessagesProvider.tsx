import pickMessages, { type MessagesNamespace } from "@/i18n/pick-messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * Hands the client components below it only the listed namespaces: these messages are
 * serialized into the HTML and RSC payload of every pre-rendered public page.
 */
export default async function ClientMessagesProvider({
	namespaces,
	children,
}: {
	namespaces: readonly MessagesNamespace[];
	children: React.ReactNode;
}) {
	const messages = await getMessages();
	return (
		<NextIntlClientProvider messages={pickMessages(messages, namespaces)}>
			{children}
		</NextIntlClientProvider>
	);
}
