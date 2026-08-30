"use client";

import { APP_NAME, APP_SHORT_DESCRIPTION, APP_SLOGAN } from "@/app-info";
import { FEATURED_TEMPLATE_ID, PROJECT_TEMPLATES } from "@/templates/index";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import {
	alpha,
	Box,
	Button,
	Divider,
	Theme,
	Typography,
} from "@mui/material";
import Link from "next/link";
import { useShallow } from "zustand/shallow";
import routes from "@/app/routes";
import AccountStatus from "./auth/AccountStatus";
import { useProjectStore } from "./projects/ProjectContext";

const featuredTemplate = PROJECT_TEMPLATES.find(
	(t) => t.id === FEATURED_TEMPLATE_ID && t.solution,
);

const AppStartup = () => {
	const {
		setOpenModalVisible,
		lifecycleManager,
		setNewProjectModalVisible,
	} = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			lifecycleManager: state.lifecycleManager,
			setNewProjectModalVisible: state.setNewProjectModalVisible,
		})),
	);

	return (
		<FlexBox
			center
			sx={{
				background: (th: Theme) => th.palette.background.default,
				minHeight: "100vh",
				py: 6,
			}}
		>
			<Box
				sx={{
					width: "760px",
					maxWidth: "100%",
					backgroundColor: "white",
					padding: 4,
					boxShadow: "1px 1px 5px rgba(0,0,0,0.2)",
				}}
			>
				<FlexBox justifyContent="flex-end">
					<AccountStatus />
				</FlexBox>

				<FlexBox alignItems="flex-start" gap={2.5}>
					<Box
						component="img"
						src="/images/icon.png"
						alt=""
						sx={{ width: "72px", mt: "0.35rem" }}
					/>
					<Box flex={1}>
						<Typography variant="h2" sx={{ fontWeight: "bold" }}>
							{APP_NAME}
						</Typography>
						<Typography
							variant="h5"
							color="text.secondary"
							sx={{ fontWeight: 600 }}
						>
							{APP_SLOGAN}
						</Typography>
						<Typography color="text.secondary" mt={0.5}>
							{APP_SHORT_DESCRIPTION}
						</Typography>
					</Box>
				</FlexBox>

				{featuredTemplate && (
					<Box
						sx={{
							mt: 3,
							p: 3,
							border: (th) => `2px solid ${th.palette.primary.main}`,
							borderRadius: 2,
							background: (th) => alpha(th.palette.primary.main, 0.04),
						}}
					>
						<Typography variant="overline" color="primary" fontWeight={600}>
							Découvrir avec un exemple
						</Typography>
						<Typography variant="h5" fontWeight={600} mt={0.5}>
							{featuredTemplate.label}
						</Typography>
						<Typography variant="body2" color="text.secondary" mt={0.5} mb={2}>
							{featuredTemplate.description}
						</Typography>
						<Button
							variant="contained"
							size="large"
							onClick={() =>
								void lifecycleManager.newProjectFromTemplate(
									featuredTemplate.id,
									"solution",
								)
							}
						>
							Ouvrir la solution et simuler
						</Button>
					</Box>
				)}

				<FlexBox alignItems="center" gap={1} mt={2}>
					<MenuBookIcon fontSize="small" color="action" />
					<Typography variant="body2" color="text.secondary">
						Besoin d&apos;aide pour démarrer ?{" "}
						<Box
							component={Link}
							href={routes.userManual()}
							sx={{
								color: "primary.main",
								fontWeight: 600,
								textDecoration: "none",
							}}
						>
							Consulter le manuel utilisateur
						</Box>
					</Typography>
				</FlexBox>

				<Divider sx={{ my: 3 }} />

				<FlexBox alignItems="center" gap={2} flexWrap="wrap">
					<Typography
						variant="body2"
						color="text.secondary"
						sx={{ mr: "auto" }}
					>
						Déjà à l&apos;aise ?
					</Typography>
					<Button
						variant="outlined"
						onClick={() => setNewProjectModalVisible(true)}
					>
						Créer un nouveau projet
					</Button>
					<Button color="primary" onClick={() => setOpenModalVisible(true)}>
						Ouvrir un projet existant
					</Button>
				</FlexBox>
			</Box>
		</FlexBox>
	);
};

export default AppStartup;
