"use client";

import routes from "@/app/routes";
import { Box, Container, Divider, Typography } from "@mui/material";
import Link from "next/link";

export default function About() {
	return (
		<Container maxWidth="md" sx={{ my: 4 }}>
			<Typography variant="h2" component="h1" color="primary" gutterBottom>
				À propos de Studomate
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h3" gutterBottom mt={3}>
				Mission
			</Typography>
			<Typography textAlign="justify">
				<strong>Studomate</strong> est un outil pédagogique dédié à l’
				<strong>automatisme</strong> : apprentissage, conception et simulation du
				GRAFCET, du Ladder et des HMI, directement dans le navigateur.
				<br />
				Sa valeur n’est pas d’être plus puissant qu’un logiciel industriel, mais
				de réduire à presque zéro la friction pour apprendre l’automatisme : pas
				d’installation, pas de licence, pas d’automate à configurer. Son
				différenciateur : GRAFCET, Ladder et HMI animées dans le même
				environnement, avec des variables partagées entre les trois.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				Ce que propose Studomate
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>
					<strong>Édition et simulation : </strong> Logiques d’automatisme
					(séquences, transitions, I/O virtuelles, temporisations, compteurs,
					analogiques).
				</li>
				<li>
					<strong>Visualisation claire :</strong> états actifs, transitions
					évaluées, sorties et effets externes.
				</li>
				<li>
					<strong>Modes d’apprentissage :</strong> pas-à-pas, scan complet et
					exécution continue.
				</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				Valeur pédagogique
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>
					<strong>Compréhension guidée :</strong> des enchaînements logiques et
					de la causalité <br />
					(entrées → transitions → étapes → actions → sorties).
				</li>
				<li>
					<strong>Apprentissage par l’essai :</strong> tester, corriger,
					retenir.
				</li>
				<li>
					<strong>Usage mixte :</strong> démonstrations en cours, exercices à la
					maison, corrections collaboratives.
				</li>
				<li>
					<strong>Boucle de correction courte :</strong> les erreurs sont
					signalées pendant l’édition, pas seulement au lancement de la
					simulation.
				</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				Vos projets vous appartiennent
			</Typography>
			<Typography textAlign="justify">
				Vos projets sont des fichiers que vous exportez et conservez. Le schéma
				est versionné et les migrations sont automatiques : un projet exporté
				aujourd’hui restera ouvrable après les mises à jour. Le code est libre
				sous licence AGPL v3. Enfin, Studomate ne demande aucun email, ne stocke
				aucune donnée personnelle et n’utilise aucun cookie de suivi.
			</Typography>

			<Typography variant="h3" gutterBottom mt={3}>
				Public cible
			</Typography>
			<Box component="ul" sx={{ listStyleType: "disc", pl: 4, pt: 1 }}>
				<li>Étudiants (BTS, IUT, écoles d’ingénieurs, universités).</li>
				<li>Enseignants et formateurs en automatisme/électrotechnique.</li>
				<li>Professionnels en reconversion ou remise à niveau.</li>
			</Box>

			<Typography variant="h3" gutterBottom mt={3}>
				Contact & contribution
			</Typography>
			<Typography>
				Des idées, des retours ou envie de contribuer ?{" "}
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
