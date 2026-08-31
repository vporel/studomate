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
				{`Fichier → Nouveau projet. Une fenêtre s'ouvre pour choisir le point de départ :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Projet vide — démarre sans variable ni interface HMI.`}</li>
				<li>{`Maquettes — projets pré-configurés avec des variables et une interface HMI déjà en place. L'étudiant n'a plus qu'à écrire le programme. Maquettes disponibles : Feu tricolore, Carrefour de feux tricolores.`}</li>
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
				{`Enregistrer un projet`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Enregistrer (Ctrl+S) — sauvegarde le projet courant en écrasant la version précédente dans le navigateur.`}
			</Typography>
			<Typography mb={2}>
				{`Fichier → Enregistrer sous (Ctrl+Shift+S) — crée une copie indépendante du projet. Une fenêtre demande le nom souhaité ; à la validation, la copie est sauvegardée et devient le projet actif. Le projet d'origine reste inchangé dans la liste des projets.`}
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
			<Typography variant="h5" mb={1}>
				{`Fichier → Exporter (Ctrl+E)`}
			</Typography>
			<Typography mb={2}>
				{`Une fenêtre s'ouvre vous proposant deux formats :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Fichier projet (JSON) — sauvegarde externe du projet entier, réimportable via Fichier → Ouvrir projet → "Ouvrir depuis un fichier...".`}</li>
				<li>{`PDF — un document visuel des programmes.`}</li>
			</Typography>
			<Typography mb={2}>
				{`Pour le PDF, deux portées :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Projet complet — une page de garde (nom du projet, auteur, date, statistiques, énoncé s'il y en a un) puis une page par grafcet/ladder coché, chaque page titrée. La page de garde peut être décochée.`}</li>
				<li>{`Page active uniquement — une seule page, titrée, pour le grafcet ou le ladder actuellement ouvert (sans page de garde). Indisponible si aucun programme n'est ouvert.`}</li>
			</Typography>
			<Typography mb={2}>
				{`Une barre de progression indique l'avancement (rendu, capture, assemblage) ; le fichier est téléchargé automatiquement à la fin. Le champ "Nom du fichier" est pré-rempli.`}
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
