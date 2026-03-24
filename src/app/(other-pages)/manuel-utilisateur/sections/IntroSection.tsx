import { Box, Divider, Typography } from "@mui/material";

export default function IntroSection() {
	return (
		<section id="intro">
			<Typography variant="h2" mb={3}>
				{`Introduction`}
			</Typography>
			<Typography mb={2}>
				{`Studomate est un éditeur graphique de Grafcet (Graphe Fonctionnel de Commande Étapes-Transitions). Il permet de créer, modifier, analyser et simuler des diagrammes Grafcet dans un environnement web interactif.`}
			</Typography>
			<Typography mb={2}>
				{`L'application offre les fonctionnalités suivantes :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Éditeur graphique Grafcet avec glisser-déposer`}</li>
				<li>{`Gestion de projets multi-grafcets`}</li>
				<li>{`Gestionnaire de variables (entrées, sorties, mémoires)`}</li>
				<li>{`Analyse statique du projet avec détection d'erreurs et d'avertissements`}</li>
				<li>{`Simulation PLC en temps réel`}</li>
				<li>{`Export du projet au format JSON`}</li>
			</Typography>
			<Typography>
				{`L'interface est entièrement en français et conçue pour être utilisée dans un contexte pédagogique ou professionnel.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
