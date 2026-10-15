import RootDocument from "@/app/RootDocument";
import NotFound from "@/app/not-found";

export default function GlobalNotFound() {
	return (
		<RootDocument lang="fr">
			<NotFound />
		</RootDocument>
	);
}
