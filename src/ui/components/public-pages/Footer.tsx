"use client";

import routes from "@/app/routes";
import { APP_NAME, APP_REPO_URL, APP_SLOGAN } from "@/app-info";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import buildReportIssueMailto from "@/ui/lib/report-issue";
import { Box, Container, Divider, Link as MuiLink, Typography } from "@mui/material";
import Link from "next/link";

const linkSx = {
	color: "text.secondary",
	textDecoration: "none",
	"&:hover": { color: "primary.main" },
};

const InternalLink = ({ href, children }: { href: string; children: string }) => (
	<Typography component={Link} href={href} variant="body2" sx={linkSx}>
		{children}
	</Typography>
);

const columns = [
	{
		title: "Ressources",
		links: [
			{ label: "Manuel utilisateur", href: routes.userManual() },
			{ label: "À propos", href: routes.about() },
			{ label: "Aide", href: "/aide" },
		],
	},
	{
		title: "Légal",
		links: [
			{ label: "Mentions légales", href: routes.legalMentions() },
			{ label: "Conditions d'utilisation", href: routes.termsOfUse() },
			{ label: "Politique de confidentialité", href: routes.privacyPolicy() },
		],
	},
];

const Footer = () => {
	return (
		<Box
			component="footer"
			sx={{
				bgcolor: "grey.100",
				borderTop: "1px solid",
				borderColor: "divider",
				py: { xs: 4, md: 6 },
			}}
		>
			<Container maxWidth="lg">
				<FlexBox
					wrap
					gap={4}
					justifyContent="space-between"
					sx={{ flexDirection: { xs: "column", sm: "row" } }}
				>
					<Box sx={{ maxWidth: 320 }}>
						<FlexBox centerVertical gap={1} mb={1}>
							<Box
								component="img"
								src="/images/icon.png"
								alt=""
								sx={{ width: 26 }}
							/>
							<Typography sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
								{APP_NAME}
							</Typography>
						</FlexBox>
						<Typography variant="body2" color="text.secondary">
							{APP_SLOGAN}
						</Typography>
						<FlexBox gap={1} mt={1.5} sx={{ flexWrap: "wrap" }}>
							<MuiLink
								href={APP_REPO_URL}
								target="_blank"
								rel="noopener noreferrer"
								variant="body2"
								sx={linkSx}
							>
								GitHub
							</MuiLink>
							<Typography variant="body2" color="text.secondary">
								·
							</Typography>
							<MuiLink
								href="https://www.gnu.org/licenses/agpl-3.0.html"
								target="_blank"
								rel="noopener noreferrer"
								variant="body2"
								sx={linkSx}
							>
								Licence AGPL v3
							</MuiLink>
						</FlexBox>
					</Box>

					{columns.map((col) => (
						<Box key={col.title}>
							<Typography
								variant="subtitle2"
								sx={{ fontWeight: "bold", mb: 1 }}
							>
								{col.title}
							</Typography>
							<FlexBox column gap={0.75}>
								{col.links.map((l) => (
									<InternalLink key={l.href} href={l.href}>
										{l.label}
									</InternalLink>
								))}
							</FlexBox>
						</Box>
					))}
				</FlexBox>

				<Divider sx={{ my: 3 }} />

				<FlexBox
					wrap
					gap={1}
					justifyContent="space-between"
					sx={{
						flexDirection: { xs: "column", sm: "row" },
						alignItems: { xs: "flex-start", sm: "center" },
					}}
				>
					<Typography variant="body2" color="text.secondary">
						© {new Date().getFullYear()} {APP_NAME}
					</Typography>
					<FlexBox gap={2} sx={{ flexWrap: "wrap" }}>
						<InternalLink href={routes.contact()}>Contact</InternalLink>
						<Typography
							component="a"
							href="#"
							variant="body2"
							sx={linkSx}
							onClick={(e: React.MouseEvent) => {
								e.preventDefault();
								window.open(
									buildReportIssueMailto(),
									"_blank",
									"noopener,noreferrer",
								);
							}}
						>
							Signaler un problème
						</Typography>
					</FlexBox>
				</FlexBox>
			</Container>
		</Box>
	);
};

export default Footer;
