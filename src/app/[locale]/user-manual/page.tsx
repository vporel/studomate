import { createGenerateMetadata } from "@/app/metadata";
import { toLocale } from "@/i18n/config";
import { setRequestLocale } from "next-intl/server";
import ClientMessagesProvider from "@/app/[locale]/ClientMessagesProvider";
import LegacyHashRedirect from "./LegacyHashRedirect";
import ManualPage from "./ManualPage";
import {
	MANUAL_CLIENT_NAMESPACES,
	MANUAL_DEFAULT_SECTION,
} from "./manual-sections";

type Props = { params: Promise<{ locale: string }> };

export const generateMetadata = createGenerateMetadata(
	"/user-manual",
	"manualTitle",
	"manualDescription",
);

export default async function UserManual({ params }: Props) {
	const { locale } = await params;
	setRequestLocale(toLocale(locale));
	return (
		<>
			<LegacyHashRedirect />
			<ClientMessagesProvider namespaces={MANUAL_CLIENT_NAMESPACES}>
				<ManualPage section={MANUAL_DEFAULT_SECTION} />
			</ClientMessagesProvider>
		</>
	);
}
