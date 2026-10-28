import { Box, SxProps, Theme } from "@mui/material";
import { marked } from "marked";

/** Rend côté serveur un Markdown issu des fichiers de traduction (contenu de confiance, non
 * saisi par l'utilisateur), pour que le texte soit présent dans le HTML initial indexé. */
export default function MarkdownBodyServer({
	source,
	sx,
}: {
	source: string;
	sx?: SxProps<Theme>;
}) {
	const html = marked.parse(source, { async: false, gfm: true, breaks: true });
	return (
		<Box
			sx={[
				{
					"& p": { my: 1, lineHeight: 1.7 },
					"& p:first-of-type": { mt: 0 },
					"& ul, & ol": { pl: 3, my: 1 },
					"& li": { my: 0.5 },
					"& code": {
						backgroundColor: "rgba(0, 0, 0, 0.06)",
						borderRadius: "4px",
						px: "4px",
						fontSize: "0.9em",
					},
				},
				...(Array.isArray(sx) ? sx : [sx]),
			].filter(Boolean)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
