"use client";

import routes from "@/app/routes";
import FlexBox from "@/lib/boxes/FlexBox";
import { Box, SxProps, Theme, Typography } from "@mui/material";
import Link from "next/link";

const linkSx: SxProps<Theme> = {
	"&:hover *": {
		color: (th) => th.palette.primary.main,
	},
};

const Footer = () => {
	return (
		<Box component="footer" sx={{ background: "rgb(230, 230, 230)", p: 2 }}>
			<Typography textAlign="center" color="black">
				Copyright © 2025 Studomate
			</Typography>
			<FlexBox center gap={1} justifyContent="center" mt={1}>
				<Box component={Link} href={routes.legalMentions()} sx={linkSx}>
					<Typography color="gray">Mentions légales</Typography>
				</Box>
				|
				<Box component={Link} href={routes.termsOfUse()} sx={linkSx}>
					<Typography color="gray">Conditions d&apos;utilisation</Typography>
				</Box>
				|
				<Box component={Link} href={routes.privacyPolicy()} sx={linkSx}>
					<Typography color="gray">Politique de confidentialité</Typography>
				</Box>
				|
				<Box component={Link} href={routes.help()} sx={linkSx}>
					<Typography color="gray">Aide</Typography>
				</Box>
				|
				<Box component={Link} href={routes.contact()} sx={linkSx}>
					<Typography color="gray">Contact</Typography>
				</Box>
			</FlexBox>
		</Box>
	);
};

export default Footer;
