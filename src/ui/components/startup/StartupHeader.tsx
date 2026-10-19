"use client";

import { APP_NAME } from "@/app-info";
import routes from "@/app/routes";
import AccountStatus from "@/ui/components/auth/AccountStatus";
import { useT } from "@/ui/i18n/useT";
import { Box, Paper, Typography } from "@mui/material";
import Link from "next/link";

export default function StartupHeader() {
	const t = useT("chrome.startup");
	return (
		<Paper
			component="header"
			variant="outlined"
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 2,
				borderRadius: 2,
				px: 2.5,
				py: 1.5,
			}}
		>
			<Box
				component={Link}
				href={routes.home()}
				aria-label={t("homeAria")}
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 1.25,
					color: "text.primary",
					textDecoration: "none",
				}}
			>
				<Box
					component="img"
					src="/images/icon.png"
					alt=""
					sx={{ width: 32, display: "block" }}
				/>
				<Typography sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
					{APP_NAME}
				</Typography>
			</Box>
			<AccountStatus />
		</Paper>
	);
}
