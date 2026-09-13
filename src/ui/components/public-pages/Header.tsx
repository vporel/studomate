"use client";

import routes from "@/app/routes";
import { APP_NAME } from "@/app-info";
import { Link, usePathname } from "@/i18n/navigation";
import AccountStatus from "@/ui/components/auth/AccountStatus";
import { useT } from "@/ui/i18n/useT";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import MenuIcon from "@mui/icons-material/Menu";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
	Box,
	Button,
	Divider,
	IconButton,
	Menu,
	MenuItem,
	Typography,
} from "@mui/material";
import NextLink from "next/link";
import { useState } from "react";
import LanguageSwitch from "./LanguageSwitch";

const Header = () => {
	const t = useT("public.header");
	const pathname = usePathname();
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	const navLinks = [
		{ label: t("home"), href: "/" as const },
		{ label: t("training"), href: "/training" as const },
		{ label: t("manual"), href: "/user-manual" as const },
		{ label: t("about"), href: "/about" as const },
	];

	return (
		<FlexBox
			component="header"
			centerVertical
			justifyContent="space-between"
			sx={{
				borderBottom: "3px solid",
				borderColor: "primary.main",
				px: { xs: 1, sm: 2 },
				py: 1,
			}}
		>
			<Box
				component={Link}
				href="/"
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
							aria-current={l.href === pathname ? "page" : undefined}
							color={l.href === pathname ? "primary" : "inherit"}
							sx={{ fontWeight: l.href === pathname ? 700 : 400 }}
						>
							{l.label}
						</Button>
					))}
				</FlexBox>

				<LanguageSwitch pathname={pathname} />

				<Box sx={{ display: { xs: "none", sm: "block" } }}>
					<AccountStatus />
				</Box>

				<Divider
					orientation="vertical"
					flexItem
					sx={{ display: { xs: "none", sm: "block" }, mx: 0.5, my: 0.5 }}
				/>

				<Button
					LinkComponent={NextLink}
					href={routes.app()}
					variant="contained"
					startIcon={<PlayArrowIcon />}
					sx={{ display: { xs: "none", sm: "inline-flex" } }}
				>
					{t("openApp")}
				</Button>

				<IconButton
					aria-label={t("menu")}
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
							selected={l.href === pathname}
							onClick={() => setAnchorEl(null)}
						>
							{l.label}
						</MenuItem>
					))}
					<MenuItem
						component={NextLink}
						href={routes.app()}
						onClick={() => setAnchorEl(null)}
					>
						{t("openApp")}
					</MenuItem>
					<Divider sx={{ my: 0.5 }} />
					<Box px={2} py={0.5}>
						<AccountStatus />
					</Box>
				</Menu>
			</FlexBox>
		</FlexBox>
	);
};

export default Header;
