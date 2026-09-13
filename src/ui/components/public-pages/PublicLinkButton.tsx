"use client";

import { Link } from "@/i18n/navigation";
import type { PublicPathname } from "@/i18n/routing";
import Button, { ButtonProps } from "@mui/material/Button";
import type { ReactNode } from "react";

/**
 * Filled/outlined button navigating to a public page, usable from a Server Component (which
 * cannot pass the `Link` component to MUI via `LinkComponent=`). This wrapper itself carries the
 * client boundary — see `PublicLink` for the plain-link equivalent.
 */
export default function PublicLinkButton({
	href,
	children,
	...buttonProps
}: {
	href: PublicPathname;
	children: ReactNode;
} & Omit<ButtonProps, "href" | "LinkComponent">) {
	return (
		<Button LinkComponent={Link} href={href} {...buttonProps}>
			{children}
		</Button>
	);
}
