import { Divider, Typography } from "@mui/material";

export default function ProjectsSection() {
	return (
		<section id="projects">
			<Typography variant="h2" mb={3}>
				{`Projets`}
			</Typography>
			<Typography mb={2}>
				{`Un projet Studomate regroupe un ou plusieurs grafcets, un ensemble de variables et des métadonnées (nom, auteur). Toutes les données sont stockées localement dans le localStorage du navigateur.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Créer un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Nouveau projet (Ctrl+N). Si un projet est déjà ouvert avec des changements non sauvegardés, une confirmation est demandée avant de continuer.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Ouvrir un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Ouvrir projet (Ctrl+O). La liste des projets sauvegardés s'affiche avec leur date de dernière modification. Cliquez sur un projet pour l'ouvrir. Chaque projet dans la liste dispose également d'un bouton de suppression (avec confirmation).`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Propriétés du projet`}
			</Typography>
			<Typography mb={2}>
				{`Projet → Propriétés. Permet de modifier le nom et l'auteur du projet. Ces informations sont sauvegardées avec le projet.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Ajouter un grafcet`}
			</Typography>
			<Typography mb={2}>
				{`Projet → Nouveau grafcet (Ctrl+G). Un nouveau grafcet vide est ajouté au projet et son onglet s'ouvre automatiquement. Vous pouvez renommer un grafcet en double-cliquant sur son nom dans l'explorateur ou via le clic droit → Renommer.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Exporter un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Exporter (Ctrl+E). Une fenêtre s'ouvre vous proposant :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Exporter le projet entier au format JSON.`}</li>
				<li>{`Exporter uniquement le grafcet actif.`}</li>
				<li>{`Option d'ajouter la date du jour au nom du fichier.`}</li>
			</Typography>
			<Typography mb={2}>
				{`Le fichier JSON téléchargé peut servir de sauvegarde externe. Pour réimporter un projet, utilisez Fichier → Ouvrir projet et importez le fichier.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Fermer un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Fermer le projet (Ctrl+F4). Si des modifications non sauvegardées existent, une confirmation est demandée.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
