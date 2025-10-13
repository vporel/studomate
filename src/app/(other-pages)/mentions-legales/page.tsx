"use client";

import routes from "@/app/routes";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";

export default function LegalMentions() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" color="primary" gutterBottom>
				Mentions légales
			</Typography>
			<Typography>Dernière mise à jour : 13/10/2024</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				1. Éditeur du site
			</Typography>
			<Typography textAlign="justify">
				Le présent site est édité par : <br />
				<strong>Studomate</strong>, projet pédagogique dédié à la simulation en automatisme pour
				l’enseignement. <br />
				<strong>Responsable de la publication</strong> : Vivian NKOUANANG (dev.vporel@gmail.com){" "}
				<br />
			</Typography>
			<Typography variant="h3" gutterBottom mt={3}>
				2. Propriété intellectuelle
			</Typography>
			<Typography textAlign="justify">
				L’ensemble du contenu présent sur le site Studomate (textes, interfaces, logos, visuels,
				structure du code, etc.) est protégé par le droit d’auteur. Toute reproduction, distribution
				ou modification sans autorisation préalable est interdite, sauf usage strictement personnel et
				éducatif.
			</Typography>
			<Typography variant="h3" gutterBottom mt={3}>
				3. Responsabilité
			</Typography>
			<Typography textAlign="justify">
				L’équipe Studomate met tout en œuvre pour assurer la fiabilité et la mise à jour des
				informations et simulations proposées. Cependant, aucune garantie n’est donnée quant à
				l’exactitude des résultats des simulations, ni à l’absence d’erreurs. L’utilisation de l’outil
				se fait sous la seule responsabilité de l’utilisateur.
			</Typography>
			<Typography variant="h3" gutterBottom mt={3}>
				4. Données personnelles
			</Typography>
			<Typography textAlign="justify">
				Aucune donnée personnelle n’est collectée sans le consentement de l’utilisateur. Les projets
				créés sont enregistrés localement sur le navigateur (localStorage). Aucune donnée n’est
				transmise à des tiers.
			</Typography>
			<Typography variant="h3" gutterBottom mt={3}>
				5. Contact
			</Typography>
			<Typography>
				Pour toute question ou signalement :{" "}
				<Box
					component={Link}
					href={routes.contact()}
					sx={{ "&, *": { color: (th) => th.palette.primary.main } }}
				>
					Contactez-nous.
				</Box>
			</Typography>
		</Container>
	);
}
