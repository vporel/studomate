"use client";

import { APP_NAME } from "@/app-info";
import { LocaleProvider } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const MIN_DESKTOP_WIDTH = 768;

const DesktopOnlyMessage = () => {
	const t = useT("chrome.mobileGuard");
	return (
		<Box
			display="flex"
			flexDirection="column"
			alignItems="center"
			justifyContent="center"
			height="100vh"
			px={4}
			textAlign="center"
			bgcolor="rgb(235, 235, 235)"
		>
			<Box
				component="img"
				src="/images/icon.png"
				alt=""
				sx={{ width: 80, mb: 2 }}
			/>
			<Typography variant="h3" fontWeight="bold" gutterBottom>
				{APP_NAME}
			</Typography>
			<Typography variant="h6" gutterBottom>
				{t("title")}
			</Typography>
			<Typography color="text.secondary" sx={{ maxWidth: 320 }}>
				{t("body")}
			</Typography>
		</Box>
	);
};

const MobileGuard = ({ children }: { children: React.ReactNode }) => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < MIN_DESKTOP_WIDTH);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	if (isMobile) {
		return (
			<LocaleProvider>
				<DesktopOnlyMessage />
			</LocaleProvider>
		);
	}

	return <>{children}</>;
};

export default MobileGuard;
