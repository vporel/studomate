"use client";

import type { Locale } from "@/i18n/config";
import { FixedLocaleProvider } from "@/ui/i18n/LocaleProvider";
import { useLocale } from "next-intl";
import type { EmbeddedAppProps, EmbeddedControl } from "./embedded-app.types";
import EmbeddedBlock from "./EmbeddedBlock";
import EmbeddedProjectProvider from "./EmbeddedProjectProvider";

const DEFAULT_HEIGHT = 480;
const NO_CONTROLS: EmbeddedControl[] = [];

/**
 * Shows a project with its editors and its simulation inside a page, without going through
 * `/app`. Everything stays in memory: nothing is saved and the project passed in is never
 * modified. The language is the one of the host page.
 */
export default function EmbeddedApp({
	controls = NO_CONTROLS,
	height = DEFAULT_HEIGHT,
	appHref,
	...providerProps
}: EmbeddedAppProps) {
	const locale = useLocale() as Locale;

	return (
		<FixedLocaleProvider locale={locale}>
			<EmbeddedProjectProvider {...providerProps}>
				<EmbeddedBlock controls={controls} height={height} appHref={appHref} />
			</EmbeddedProjectProvider>
		</FixedLocaleProvider>
	);
}
