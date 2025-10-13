"use client";

import routes from "@/app/routes";
import { Box, Container, Typography } from "@mui/material";
import Link from "next/link";

export default function TermsOfUse() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" color="primary" gutterBottom>
				Conditions générales d’utilisation
			</Typography>
			<Typography>Dernière mise à jour : 13/10/2025</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				1. Objet
			</Typography>
			<Typography textAlign="justify">
				Les présentes conditions encadrent l’accès et l’utilisation de <strong>Studomate</strong>, une
				application pédagogique dédiée à l’apprentissage, la conception et la simulation de systèmes
				automatisés. L’outil met à disposition des espaces interactifs pour représenter, simuler et
				comprendre différents langages, schémas et logiques liés à l’automatisme industriel. <br />
				En accédant à Studomate, l’utilisateur reconnaît avoir lu et accepté ces conditions.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				2. Usage autorisé
			</Typography>
			<Typography textAlign="justify">
				Studomate est conçu pour un usage éducatif et professionnel encadré : enseignement, formation,
				auto-apprentissage ou démonstration technique. L’utilisateur s’engage à :
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>Utiliser la plateforme dans le respect des lois et des droits d’autrui ;</li>
				<li>Ne pas détourner l’application à des fins illicites, commerciales ou malveillantes ;</li>
				<li>Ne pas modifier ni tenter d’accéder au code source sans autorisation ;</li>
				<li>Mentionner Studomate dans tout usage public l’intégrant.</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				3. Comptes et données
			</Typography>
			<Typography textAlign="justify">
				La version actuelle de Studomate ne nécessite aucune inscription. Les projets et simulations
				sont enregistrés <strong>localement</strong> dans des <strong>fichiers</strong>. L’utilisateur
				est responsable de la sauvegarde de ses fichiers. Aucune donnée personnelle n’est transmise à
				des serveurs externes sans consentement explicite.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				4. Propriété intellectuelle
			</Typography>
			<Typography textAlign="justify">
				L’ensemble du contenu technique, graphique et conceptuel de Studomate (interface, moteur,
				icônes, structure) demeure la propriété de ses auteurs. Toute reproduction, modification ou
				diffusion sans autorisation écrite est interdite. L’utilisateur reste propriétaire des projets
				et créations qu’il développe sur la plateforme.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				5. Responsabilité
			</Typography>
			<Typography textAlign="justify">
				Studomate vise à faciliter la compréhension des systèmes automatisés. Il s’agit d’un outil
				pédagogique, non d’un logiciel industriel certifié. Aucune garantie n’est donnée quant à la
				précision absolue des simulations, à la compatibilité avec des équipements réels ou à la
				conservation prolongée des données. L’utilisation de l’application se fait sous la seule
				responsabilité de l’utilisateur.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				6. Évolution du service
			</Typography>
			<Typography textAlign="justify">
				Studomate évolue en continu. Les fonctionnalités peuvent être modifiées, ajoutées ou
				suspendues sans préavis, notamment lors de phases de test ou de maintenance. L’équipe
				s’efforce de maintenir un service stable et transparent.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				7. Contact
			</Typography>
			<Typography>
				Pour toute question, suggestion ou signalement technique :{" "}
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
