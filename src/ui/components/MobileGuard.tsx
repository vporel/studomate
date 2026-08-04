"use client";

import { APP_NAME } from "@/app-info";
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";

const MobileGuard = ({ children }: { children: React.ReactNode }) => {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 768);
		check();
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	if (isMobile) {
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
				<Box component="img" src="/images/icon.png" alt="Logo" sx={{ width: 80, mb: 2 }} />
				<Typography variant="h3" fontWeight="bold" gutterBottom>
					{APP_NAME}
				</Typography>
				<Typography variant="h6" gutterBottom>
					Application desktop uniquement
				</Typography>
				<Typography color="text.secondary" sx={{ maxWidth: 320 }}>
					Cette application est disponible uniquement sur desktop. Veuillez y accéder depuis un
					ordinateur.
				</Typography>
			</Box>
		);
	}

	return <>{children}</>;
};

export default MobileGuard;
