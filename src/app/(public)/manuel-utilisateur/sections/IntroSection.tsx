import { Divider, Typography } from "@mui/material";

export default function IntroSection() {
	return (
		<section id="intro">
			<Typography variant="h2" mb={3}>
				{`Introduction`}
			</Typography>
			<Typography mb={2}>
				{`Studomate est un éditeur graphique pour l'automatisme : Grafcet (Graphe Fonctionnel de Commande Étapes-Transitions) et Ladder (schéma à contacts). Il permet de créer, modifier, analyser et simuler ces diagrammes dans un environnement web interactif.`}
			</Typography>
			<Typography mb={2}>
				{`L'application offre les fonctionnalités suivantes :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Éditeurs graphiques Grafcet et Ladder avec glisser-déposer`}</li>
				<li>{`Gestion de projets regroupant plusieurs grafcets et ladders`}</li>
				<li>{`Gestionnaire de variables (entrées, sorties, mémoires)`}</li>
				<li>{`Analyse statique du projet avec détection d'erreurs et d'avertissements`}</li>
				<li>{`Simulation PLC en temps réel`}</li>
				<li>{`Export du projet au format JSON, ou du grafcet actif en image`}</li>
			</Typography>
			<Typography mb={2}>
				{`L'interface est entièrement en français et conçue pour être utilisée dans un contexte pédagogique ou professionnel.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Repères`}
			</Typography>
			<Typography mb={1}>
				{`Ce manuel documente l'outil, pas la méthode Grafcet elle-même. Quelques repères utiles si les termes ci-dessous ne sont pas déjà familiers :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Étape — état stable du système, actif ou inactif.`}</li>
				<li>{`Transition — condition de passage d'une étape à la suivante.`}</li>
				<li>{`Réceptivité — expression booléenne associée à une transition ; elle doit être vraie pour que la transition soit franchie.`}</li>
				<li>{`Divergence / convergence en ET — ouverture puis fermeture de branches parallèles, toutes actives en même temps.`}</li>
				<li>{`Divergence / convergence en OU — ouverture puis fermeture de branches alternatives, une seule active à la fois.`}</li>
				<li>{`Front montant / descendant — instant où une condition passe respectivement de faux à vrai, ou de vrai à faux.`}</li>
			</Typography>
			<Typography mb={2}>
				{`Pour une première découverte, un ordre de lecture logique est : Démarrer, puis Grafcet (dans l'ordre du plan : Canvas, Étapes, Transitions, Actions), avant Simulation et Analyse. Les autres sections (Ladder, Variables, Explorateur, Barre d'outils, Raccourcis) se consultent au besoin.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
