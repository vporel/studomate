"use client";

import routes from "@/app/routes";
import { Box, Container, Divider, Typography } from "@mui/material";
import Link from "next/link";

export default function PrivacyPolicy() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" color="primary" gutterBottom>
				Politique de confidentialité
			</Typography>
			<Typography>Dernière mise à jour : 13/10/2025</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h3" gutterBottom mt={3}>
				1. Introduction
			</Typography>
			<Typography textAlign="justify">
				Cette politique de confidentialité décrit la manière dont <strong>Studomate</strong> gère les
				données personnelles et techniques des utilisateurs. Elle vise à garantir la transparence et à
				préciser les choix offerts en matière de confidentialité.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				2. Données collectées
			</Typography>
			<Typography textAlign="justify">
				La version actuelle de Studomate ne collecte aucune donnée personnelle de manière automatique.{" "}
				Les informations créées par l’utilisateur sont stockées <strong>localement</strong> dans des
				<strong>fichiers</strong>. <br />
				Aucune de ces données n’est transmise à des serveurs distants ni partagée avec des tiers.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				3. Utilisation future des données
			</Typography>
			<Typography textAlign="justify">
				Des fonctionnalités à venir pourront nécessiter la création de comptes utilisateurs ou la
				sauvegarde cloud de projets. Dans ce cas :
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>Seules les données strictement nécessaires seront collectées (nom, email, projets) ;</li>
				<li>Les utilisateurs seront informés avant toute activation de ces services ;</li>
				<li>Leur consentement explicite sera requis.</li>
			</Box>
			<Typography variant="h3" gutterBottom mt={3}>
				4. Sécurité et confidentialité
			</Typography>
			<Typography textAlign="justify">
				Studomate s’engage à assurer un haut niveau de protection des informations stockées localement
				et à ne jamais exploiter les données des utilisateurs à des fins commerciales ou
				publicitaires. Les utilisateurs restent responsables de la sécurité de leurs fichiers
				exportés.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				5. Cookies et stockage local
			</Typography>
			<Typography textAlign="justify">
				Studomate n’utilise aucun cookie de suivi. Seules des données techniques sont enregistrées
				localement pour le bon fonctionnement des projets (identifiants internes, états de simulation,
				paramètres sauvegardés).
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				6. Droits de l’utilisateur
			</Typography>
			<Typography textAlign="justify">
				Conformément au Règlement Général sur la Protection des Données (RGPD), tout utilisateur peut
				:
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>Supprimer ses données ;</li>
				<li>Exporter ou sauvegarder manuellement ses projets à tout moment ;</li>
				<li>Contacter l’équipe pour toute question relative à la confidentialité.</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				7. Contact
			</Typography>
			<Typography>
				Pour toute question concernant la confidentialité ou la gestion des données :{" "}
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
