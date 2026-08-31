"use client";

import routes from "@/app/routes";
import { Box, Container, Divider, Typography } from "@mui/material";
import Link from "next/link";

export default function PrivacyPolicy() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				Politique de confidentialité
			</Typography>
			<Typography>Dernière mise à jour : 31/08/2026</Typography>
			<Divider sx={{ my: 2 }} />

			<Typography variant="h3" gutterBottom mt={3}>
				1. Introduction
			</Typography>
			<Typography textAlign="justify">
				Cette politique de confidentialité décrit la manière dont{" "}
				<strong>Studomate</strong> gère les données personnelles et techniques
				des utilisateurs. Elle vise à garantir la transparence et à préciser les
				choix offerts en matière de confidentialité.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				2. Données collectées
			</Typography>
			<Typography textAlign="justify">
				Studomate ne collecte aucune donnée personnelle identifiante de manière
				automatique. Par défaut, les projets créés par l’utilisateur sont
				stockés <strong>localement</strong> dans son navigateur et ne sont
				transmis à aucun serveur distant. <br />
				Des données ne quittent l’appareil de l’utilisateur que dans deux cas,
				décrits ci-dessous : la mesure d’audience (§3) et, s’il choisit de
				créer un compte, les comptes et la sauvegarde cloud (§4).
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				3. Mesure d’audience
			</Typography>
			<Typography textAlign="justify">
				Studomate utilise <strong>Umami</strong> (hébergé dans l’Union
				européenne) pour mesurer la fréquentation du site : nombre de visites,
				pages consultées, sources de trafic, type d’appareil, ainsi que
				quelques événements d’usage anonymes (création d’un projet, lancement
				d’une simulation). Ces mesures se font <strong>sans cookie</strong>,
				sans stockage de l’adresse IP et sans permettre d’identifier ou de
				suivre un utilisateur d’une visite à l’autre. Aucune donnée n’est
				vendue ni utilisée à des fins publicitaires.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				4. Comptes et sauvegarde cloud
			</Typography>
			<Typography textAlign="justify">
				La création d’un compte est <strong>facultative</strong> : sans
				compte, Studomate fonctionne entièrement en local et aucune donnée
				n’est envoyée à nos serveurs. En créant un compte, l’utilisateur peut
				sauvegarder ses projets dans le cloud et les retrouver sur un autre
				appareil.
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>
					<strong>Compte classique :</strong> adresse email et mot de passe.
				</li>
				<li>
					<strong>Compte anonyme :</strong> pseudonyme et mot de passe, sans
					adresse email.
				</li>
				<li>
					<strong>Données stockées :</strong> un identifiant de compte,
					l’email ou le pseudonyme, et uniquement les projets que
					l’utilisateur choisit d’enregistrer dans le cloud.
				</li>
			</Box>
			<Typography textAlign="justify" mt={1}>
				Ces données sont hébergées chez notre sous-traitant{" "}
				<strong>Supabase</strong>, sur une infrastructure située dans l’Union
				européenne. Chaque compte n’a accès qu’à ses propres données
				(isolation appliquée au niveau de la base). Aucune donnée n’est vendue
				ni utilisée à des fins publicitaires.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				5. Sécurité et confidentialité
			</Typography>
			<Typography textAlign="justify">
				Studomate s’engage à assurer un haut niveau de protection des données
				et à ne jamais les exploiter à des fins commerciales ou publicitaires.
				Les échanges avec le cloud sont chiffrés en transit (HTTPS) et l’accès
				aux projets sauvegardés est restreint au compte qui les a créés. Les
				utilisateurs restent responsables de la sécurité de leurs fichiers
				exportés localement.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				6. Cookies et stockage local
			</Typography>
			<Typography textAlign="justify">
				Studomate n’utilise aucun cookie de suivi. Seules des données techniques
				sont enregistrées localement pour le bon fonctionnement des projets
				(identifiants internes, états de simulation, paramètres sauvegardés).
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				7. Droits de l’utilisateur
			</Typography>
			<Typography textAlign="justify">
				Conformément au Règlement Général sur la Protection des Données (RGPD),
				tout utilisateur peut :
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>
					Effacer à tout moment les données locales de son navigateur ;
				</li>
				<li>
					Exporter ou sauvegarder manuellement ses projets à tout moment ;
				</li>
				<li>
					Demander la suppression de son compte et des projets associés en
					contactant l’équipe (§8).
				</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				8. Contact
			</Typography>
			<Typography>
				Pour toute question concernant la confidentialité ou la gestion des
				données :{" "}
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
