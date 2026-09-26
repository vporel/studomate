"use client";

import { Box, SxProps, Theme } from "@mui/material";
import { useEffect, useState } from "react";
import renderMarkdown from "./markdown";

const BASE_SX: SxProps<Theme> = {
	"& h1, & h2, & h3": { mt: 3, mb: 1.5 },
	"& h1:first-of-type, & h2:first-of-type, & h3:first-of-type": { mt: 0 },
	"& p": { my: 1, lineHeight: 1.7 },
	"& p:first-of-type": { mt: 0 },
	"& p:last-of-type": { mb: 0 },
	"& ul, & ol": { pl: 3, my: 1 },
	"& li": { my: 0.5 },
	"& code": {
		backgroundColor: "rgba(0, 0, 0, 0.06)",
		borderRadius: "4px",
		px: "4px",
		fontSize: "0.9em",
	},
	"& pre": {
		backgroundColor: "rgba(0, 0, 0, 0.06)",
		borderRadius: "6px",
		p: 1.5,
		overflowX: "auto",
	},
	"& pre code": { backgroundColor: "transparent", px: 0 },
	"& figure": { display: "inline-block", textAlign: "center", m: 1, maxWidth: "100%" },
	"& figure img": { display: "block", mx: "auto", maxWidth: "100%", height: "auto" },
	"& figcaption": { fontSize: "0.8rem", color: "text.secondary", mt: 0.5 },
	"& table": { borderCollapse: "collapse", my: 1 },
	"& th, & td": {
		border: "1px solid rgba(0, 0, 0, 0.2)",
		padding: "4px 8px",
	},
	"& a": { color: "primary.main" },
};

/** Rend une source Markdown en HTML assaini via `renderMarkdown`, avec le style de base commun
 * (énoncé d'exercice, contenu de formation...). `sx` complète (ne remplace pas) ce style de base. */
export default function MarkdownBody({
	source,
	sx,
}: {
	source: string;
	sx?: SxProps<Theme>;
}) {
	const [html, setHtml] = useState("");

	useEffect(() => {
		let cancelled = false;
		void renderMarkdown(source).then((rendered) => {
			if (!cancelled) setHtml(rendered);
		});
		return () => {
			cancelled = true;
		};
	}, [source]);

	return (
		<Box
			className="markdown-body"
			sx={[BASE_SX, ...(Array.isArray(sx) ? sx : [sx])].filter(Boolean)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
