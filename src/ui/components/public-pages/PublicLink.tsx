"use client";

import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import MuiLink from "@mui/material/Link";
import type { ComponentProps, ReactNode } from "react";

/**
 * Lien interne coloré vers une page publique, utilisable depuis un Server Component (qui ne peut
 * pas passer le composant `Link` à MUI via `component=`). Ce wrapper porte lui-même la frontière
 * client. `locale` points to the page in another language than the current one.
 */
export default function PublicLink({
	href,
	locale,
	children,
}: {
	href: ComponentProps<typeof Link>["href"];
	locale?: Locale;
	children: ReactNode;
}) {
	return (
		<MuiLink
			component={Link}
			href={href}
			locale={locale}
			hrefLang={locale}
			sx={{ color: "primary.main", textDecorationColor: "inherit" }}
		>
			{children}
		</MuiLink>
	);
}
