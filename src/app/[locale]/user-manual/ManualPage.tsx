"use client";

import type { Locale } from "@/i18n/config";
import PageTitle from "@/ui/components/public-pages/PageTitle";
import { useT } from "@/ui/i18n/useT";
import { Container, Divider, Grid } from "@mui/material";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import ManualContentIndex, {
	ManualContentIndex as ManualContentIndexType,
} from "./ManualContentIndex";
import { ManualHeadingOffsetProvider } from "./manual-heading";
import ManualNav from "./ManualNav";
import ManualSearch from "./ManualSearch";
import ManualSections from "./ManualSections";
import manualPath from "./manual-path";
import { MANUAL_DEFAULT_SECTION } from "./manual-sections";

export default function ManualPage({
	section,
	breadcrumb,
}: {
	section: string;
	/** Fil d'Ariane rendu au-dessus du titre. */
	breadcrumb?: ReactNode;
}) {
	const t = useT("manual");
	const locale = useLocale() as Locale;
	const router = useRouter();
	const [contentIndex, setContentIndex] = useState<ManualContentIndexType>({});

	const handleSelect = useCallback(
		(id: string) => {
			const path = manualPath(locale, id);
			if (path) router.push(path);
		},
		[locale, router],
	);

	const isIndex = section === MANUAL_DEFAULT_SECTION;

	return (
		<Container maxWidth="lg" sx={{ my: 4, minHeight: "70vh" }}>
			{breadcrumb}
			<PageTitle as={isIndex ? "h1" : "p"}>{t("pageTitle")}</PageTitle>
			<Divider sx={{ my: 2 }} />

			<ManualSearch contentIndex={contentIndex} onSelect={handleSelect} />

			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 3 }}>
					<ManualNav selected={section} />
				</Grid>
				<Grid size={{ xs: 12, md: 9 }}>
					<ManualHeadingOffsetProvider offset={isIndex ? 0 : 1}>
						<ManualSections selected={section} />
					</ManualHeadingOffsetProvider>
				</Grid>
			</Grid>

			<ManualContentIndex onReady={setContentIndex} />
		</Container>
	);
}
