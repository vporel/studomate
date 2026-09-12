import { Box, Typography } from "@mui/material";
import { Fragment, type ReactNode } from "react";

/**
 * Rend un texte de traduction contenant des balises `<strong>…</strong>` (seul markup admis
 * dans les contenus juridiques / éditoriaux). Évite `t.rich` et son typage strict des clés,
 * inutilisable sur des accès indexés de tableau.
 */
export function renderStrong(text: string): ReactNode {
	return text.split(/(<strong>.*?<\/strong>)/g).map((part, i) => {
		const match = part.match(/^<strong>(.*?)<\/strong>$/);
		return match ? (
			<strong key={i}>{match[1]}</strong>
		) : (
			<Fragment key={i}>{part}</Fragment>
		);
	});
}

/** Un article d'une page juridique : un titre `h3` et son corps. */
export default function LegalArticle({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<>
			<Typography variant="h3" gutterBottom mt={3}>
				{title}
			</Typography>
			{typeof children === "string" ? (
				<Typography textAlign="justify">{children}</Typography>
			) : (
				children
			)}
		</>
	);
}

export function LegalList({ items }: { items: string[] }) {
	return (
		<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
			{items.map((item, i) => (
				<li key={i}>{renderStrong(item)}</li>
			))}
		</Box>
	);
}
