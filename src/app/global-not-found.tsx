import RootDocument from "@/app/RootDocument";
import { TITLE_TEMPLATE } from "@/app/metadata";
import NotFound from "@/app/not-found";
import { notFound as en } from "@/i18n/messages/en/public.json";
import { notFound as fr } from "@/i18n/messages/fr/public.json";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: TITLE_TEMPLATE.replace("%s", `${fr.title} / ${en.title}`),
};

export default function GlobalNotFound() {
	return (
		<RootDocument lang="fr">
			<NotFound />
		</RootDocument>
	);
}
