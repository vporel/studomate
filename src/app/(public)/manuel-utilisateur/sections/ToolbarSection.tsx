import { Divider, Typography } from "@mui/material";

export default function ToolbarSection() {
	return (
		<section id="toolbar">
			<Typography variant="h2" mb={3}>
				{`Barre d'outils`}
			</Typography>
			<Typography mb={2}>
				{`La barre d'outils est divisée en deux zones : les actions générales (haut gauche) et les outils de création Grafcet (haut, spécifiques à un grafcet ouvert).`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Actions générales`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Accueil — retour à la page d'accueil`}</li>
				<li>{`Enregistrer — sauvegarde le projet en cours`}</li>
				<li>{`Annuler (Ctrl+Z) — annule la dernière action`}</li>
				<li>{`Rétablir (Ctrl+Y) — rétablit l'action annulée`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Nom du projet et indicateur`}
			</Typography>
			<Typography mb={2}>
				{`Le champ de nom du projet (en haut, centre) est modifiable directement. Un indicateur visuel signale les modifications non sauvegardées.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Analyse et mode`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Bouton Analyser — lance l'analyse statique du projet. Devient rouge en cas d'erreurs, orange en cas d'avertissements seulement.`}</li>
				<li>{`Sélecteur de mode — permet de basculer entre le mode Conception (édition) et le mode Simulation. Le fond clignote en orange-gris en mode Simulation.`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Outils de création Grafcet`}
			</Typography>
			<Typography mb={2}>
				{`Lorsqu'un grafcet est ouvert, des outils supplémentaires apparaissent. Faites glisser l'outil choisi sur le canvas pour créer l'élément correspondant :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Étape initiale`}</li>
				<li>{`Étape normale`}</li>
				<li>{`Action`}</li>
				<li>{`Transition`}</li>
				<li>{`Divergence en OU`}</li>
				<li>{`Convergence en OU`}</li>
				<li>{`Divergence en ET`}</li>
				<li>{`Convergence en ET`}</li>
				<li>{`Tenant (source de renvoi)`}</li>
				<li>{`Aboutissant (cible de renvoi)`}</li>
				<li>{`Commentaire`}</li>
			</Typography>
			<Typography mb={2}>
				{`Les boutons Zoom + et Zoom − permettent d'ajuster le niveau de zoom du canvas.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
