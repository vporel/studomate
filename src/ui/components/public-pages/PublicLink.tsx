"use client";

import { Link } from "@/i18n/navigation";
import MuiLink from "@mui/material/Link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Lien interne coloré vers une page publique, utilisable depuis un Server Component (qui ne peut
 * pas passer le composant `Link` à MUI via `component=`). Ce wrapper porte lui-même la frontière
 * client.
 */
export default function PublicLink({
	href,
	children,
}: {
	href: ComponentProps<typeof Link>["href"];
	children: ReactNode;
}) {
	return (
		<MuiLink
			component={Link}
			href={href}
			sx={{ color: "primary.main", textDecorationColor: "inherit" }}
		>
			{children}
		</MuiLink>
	);
}
