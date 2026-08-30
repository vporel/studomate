"use client";

import routes from "@/app/routes";
import { APP_NAME } from "@/app-info";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import MenuIcon from "@mui/icons-material/Menu";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
	Box,
	Button,
	IconButton,
	Menu,
	MenuItem,
	Typography,
} from "@mui/material";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
	{ label: "Accueil", href: routes.home() },
	{ label: "Manuel", href: routes.userManual() },
	{ label: "À propos", href: routes.about() },
];

const Header = () => {
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	return (
		<FlexBox
			component="header"
			centerVertical
			justifyContent="space-between"
			sx={{
				borderBottom: "1px solid lightgray",
				px: { xs: 1, sm: 2 },
				py: 1,
			}}
		>
			<Box
				component={Link}
				href={routes.home()}
				sx={{ textDecoration: "none", "&:hover *": { color: "inherit" } }}
			>
				<FlexBox centerVertical gap={1}>
					<Box
						component="img"
						src="/images/icon.png"
						alt=""
						sx={{ width: "30px" }}
					/>
					<Typography
						sx={{
							color: "text.primary",
							fontWeight: "bold",
							fontSize: "1.2rem",
						}}
					>
						{APP_NAME}
					</Typography>
				</FlexBox>
			</Box>

			<FlexBox centerVertical gap={1}>
				<FlexBox
					centerVertical
					gap={0.5}
					sx={{ display: { xs: "none", sm: "flex" } }}
				>
					{navLinks.map((l) => (
						<Button
							key={l.href}
							LinkComponent={Link}
							href={l.href}
							color="inherit"
						>
							{l.label}
						</Button>
					))}
				</FlexBox>

				<Button
					LinkComponent={Link}
					href={routes.app()}
					variant="contained"
					startIcon={<PlayArrowIcon />}
					sx={{ display: { xs: "none", sm: "inline-flex" } }}
				>
					Ouvrir l&apos;application
				</Button>

				<IconButton
					aria-label="Menu"
					onClick={(e) => setAnchorEl(e.currentTarget)}
					sx={{ display: { xs: "inline-flex", sm: "none" } }}
				>
					<MenuIcon />
				</IconButton>
				<Menu
					anchorEl={anchorEl}
					open={!!anchorEl}
					onClose={() => setAnchorEl(null)}
				>
					{navLinks.map((l) => (
						<MenuItem
							key={l.href}
							component={Link}
							href={l.href}
							onClick={() => setAnchorEl(null)}
						>
							{l.label}
						</MenuItem>
					))}
					<MenuItem
						component={Link}
						href={routes.app()}
						onClick={() => setAnchorEl(null)}
					>
						Ouvrir l&apos;application
					</MenuItem>
				</Menu>
			</FlexBox>
		</FlexBox>
	);
};

export default Header;
