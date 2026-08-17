import { Divider, Typography } from "@mui/material";

export default function ProjectsSection() {
	return (
		<section id="projects">
			<Typography variant="h2" mb={3}>
				{`Projets`}
			</Typography>
			<Typography mb={2}>
				{`Un projet Studomate regroupe un ou plusieurs programmes (grafcets et/ou ladders), un ensemble de variables et des métadonnées (nom, auteur, dialecte). Toutes les données sont stockées localement dans le localStorage du navigateur.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Créer un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Nouveau projet (aucun raccourci clavier). Si un projet est déjà ouvert avec des changements non sauvegardés, une confirmation est demandée avant de continuer.`}
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
				{`Projet → Propriétés. Permet de modifier le nom, l'auteur et le dialecte du projet. Ces informations sont sauvegardées avec le projet.`}
			</Typography>
			<Typography mb={2}>
				{`Le dialecte détermine les mots-clés utilisés dans les expressions (réceptivités, actions) : Français (ET, OU, NON, VRAI, FAUX) ou Anglais (AND, OR, NOT, TRUE, FALSE). Changer le dialecte traduit automatiquement les expressions déjà écrites.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Ajouter un grafcet ou un ladder`}
			</Typography>
			<Typography mb={2}>
				{`Projet → Nouveau grafcet (Ctrl+G) ou Projet → Nouveau ladder (Ctrl+L). Le nouveau programme est ajouté au projet et son onglet s'ouvre automatiquement. Vous pouvez le renommer en double-cliquant sur son nom dans l'explorateur ou via le clic droit → Renommer (F2).`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Exporter un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Exporter (Ctrl+E). Une fenêtre s'ouvre vous proposant deux options exclusives :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Exporter le projet entier au format JSON — cette sauvegarde externe peut être réimportée.`}</li>
				<li>{`Exporter le grafcet actif en image (JPEG) — un instantané visuel, pas un fichier réimportable. Disponible uniquement si le programme actif est un grafcet (pas un ladder).`}</li>
			</Typography>
			<Typography mb={2}>
				{`Une case à cocher permet d'ajouter la date du jour au nom du fichier. Pour réimporter un projet, utilisez Fichier → Ouvrir projet → "Ouvrir depuis un fichier..." et sélectionnez le fichier JSON.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Fermer un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Fermer le projet (Ctrl+F4 sur Windows/Linux, Cmd+W sur macOS). Si des modifications non sauvegardées existent, une confirmation est demandée.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
