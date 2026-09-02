import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` conscients de la locale et des
 * slugs traduits (`routing.pathnames`). À utiliser dans les pages publiques à la place des
 * équivalents `next/navigation` / `next/link`.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createNavigation(routing);
