"use client";

import { APP_VERSION } from "@/app-info";
import routes from "@/app/routes";
import { useT } from "@/ui/i18n/useT";
import { openReportIssue } from "@/ui/services/report-issue";
import { whatsNewStore } from "@/ui/stores/whats-new/whats-new.store";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";

const linkSx = {
	color: "inherit",
	textDecoration: "none",
	"&:hover": { textDecoration: "underline", color: "text.primary" },
};

export default function StartupFooter() {
	const t = useT("chrome.startup.footer");
	const links = [
		{ href: routes.about(), label: t("about") },
		{ href: routes.legalMentions(), label: t("legalMentions") },
		{ href: routes.termsOfUse(), label: t("terms") },
		{ href: routes.privacyPolicy(), label: t("privacy") },
	];

	const items: ReactNode[] = [
		<Box key="copyright" sx={{ display: "flex", columnGap: 0.75 }}>
			<Typography variant="body2">
				{t("copyright", { year: new Date().getFullYear() })}
			</Typography>
			<MuiLink
				component="button"
				type="button"
				variant="body2"
				title={t("whatsNew", { version: APP_VERSION })}
				onClick={() => whatsNewStore.getState().open()}
				sx={linkSx}
			>
				{APP_VERSION}
			</MuiLink>
		</Box>,
		...links.map(({ href, label }) => (
			<Typography
				key={href}
				component={Link}
				href={href}
				variant="body2"
				sx={linkSx}
			>
				{label}
			</Typography>
		)),
		<MuiLink
			key="report-issue"
			component="button"
			type="button"
			variant="body2"
			onClick={openReportIssue}
			sx={linkSx}
		>
			{t("reportIssue")}
		</MuiLink>,
	];

	return (
		<Box
			component="footer"
			sx={{
				display: "flex",
				flexWrap: "wrap",
				justifyContent: "center",
				alignItems: "center",
				columnGap: 1,
				rowGap: 0.5,
				mt: 6,
				pt: 2,
				borderTop: 1,
				borderColor: "divider",
				color: "text.secondary",
			}}
		>
			{items.map((item, index) => (
				<Fragment key={index}>
					{index > 0 && (
						<Typography variant="body2" aria-hidden>
							·
						</Typography>
					)}
					{item}
				</Fragment>
			))}
		</Box>
	);
}
