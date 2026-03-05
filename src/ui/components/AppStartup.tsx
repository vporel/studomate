"use client";

import { APP_NAME, APP_SHORT_DESCRIPTION, APP_SLOGAN } from "@/ui/constants";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { alpha, Box, Button, Divider, Grid, SxProps, Theme, Typography } from "@mui/material";
import Link from "next/link";
import { useShallow } from "zustand/shallow";
import routes from "../../app/routes";
import { useProjectStore } from "./projects/ProjectContext";

const buttonSx: SxProps<Theme> = {
	padding: "4rem 2rem",
	fontSize: "1.2rem",
	background: (th) => alpha(th.palette.primary.main, 0.1),
	transition: "all 0.2s ease",
	"&:hover": {
		background: (th) => alpha(th.palette.primary.main, 1),
		color: "white",
		transform: "scale(1.02) translateY(-5px)",
	},
};

const linkSx: SxProps<Theme> = {
	"*": {
		fontSize: "12px",
	},
	"&:hover *": {
		color: (th) => th.palette.primary.main,
	},
};

const AppStartup = () => {
	const { setOpenModalVisible, newProject } = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			newProject: state.newProject,
		})),
	);

	return (
		<FlexBox center sx={{ background: "rgb(235, 235, 235)", height: "100vh" }}>
			<Box
				sx={{
					width: "800px",
					backgroundColor: "white",
					padding: 4,
					boxShadow: "1px 1px 5px rgba(0,0,0,0.2)",
				}}
			>
				<FlexBox centerVertical gap={2.5}>
					<Box
						component="img"
						src="/images/icon.png"
						sx={{ width: "80px", marginBottom: "0.5rem" }}
					/>
					<Box flex={1}>
						<Typography
							variant="h2"
							sx={{
								fontWeight: "bold",
							}}
						>
							{APP_NAME}
						</Typography>
						<Typography variant="h4" color="gray" gutterBottom>
							{APP_SLOGAN}
						</Typography>
						<Typography color="rgb(80, 80, 80)" gutterBottom>
							{APP_SHORT_DESCRIPTION}
						</Typography>
					</Box>
				</FlexBox>
				<Grid container spacing={2} mt={4}>
					<Grid size={{ xs: 12, md: 6 }}>
						<Button fullWidth sx={buttonSx} onClick={newProject}>
							Créer un <br /> nouveau projet
						</Button>
					</Grid>
					<Grid size={{ xs: 12, md: 6 }}>
						<Button fullWidth sx={buttonSx} onClick={() => setOpenModalVisible(true)}>
							Ouvrir un <br /> projet existant
						</Button>
					</Grid>
				</Grid>
				<Divider sx={{ mt: 4, mb: 4 }} />
				<Typography textAlign="center" color="gray">
					Copyright © 2025 Studomate
				</Typography>
				<FlexBox center gap={1} justifyContent="center" mt={1}>
					<Box component={Link} href={routes.about()} sx={linkSx}>
						<Typography color="gray">À propos</Typography>
					</Box>
					|
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
					<Box component={Link} href={routes.userManual()} sx={linkSx}>
						<Typography color="gray">Manuel utilisateur</Typography>
					</Box>
					|
					<Box component={Link} href={routes.contact()} sx={linkSx}>
						<Typography color="gray">Contact</Typography>
					</Box>
				</FlexBox>
			</Box>
		</FlexBox>
	);
};

export default AppStartup;
