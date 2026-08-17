import { Divider, Typography } from "@mui/material";

export default function GettingStartedSection() {
	return (
		<section id="getting-started">
			<Typography variant="h2" mb={3}>
				{`Démarrer`}
			</Typography>
			<Typography variant="h4" mb={2}>
				{`Créer un nouveau projet`}
			</Typography>
			<Typography mb={2}>
				{`Au démarrage de l'application, la page d'accueil s'affiche. Vous pouvez :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Cliquer sur "Nouveau projet" pour créer un projet vide.`}</li>
				<li>{`Utiliser le menu Fichier → Nouveau projet (aucun raccourci clavier : Ctrl+N est réservé par le navigateur pour ouvrir une nouvelle fenêtre).`}</li>
			</Typography>
			<Typography mb={2}>
				{`Un nouveau projet est créé avec un grafcet vide. Vous pouvez définir le nom du projet et l'auteur via le menu Projet → Propriétés.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Ouvrir un projet existant`}
			</Typography>
			<Typography mb={2}>
				{`Via le menu Fichier → Ouvrir projet (Ctrl+O), une liste de tous les projets sauvegardés s'affiche. Cliquez sur un projet pour l'ouvrir. Si un projet est déjà ouvert avec des modifications non sauvegardées, une confirmation vous sera demandée.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Sauvegarder`}
			</Typography>
			<Typography mb={2}>
				{`Utilisez Fichier → Enregistrer (Ctrl+S) pour sauvegarder votre projet. Un indicateur dans la barre de titre signale les modifications non sauvegardées. Les projets sont stockés dans le localStorage du navigateur.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Interface principale`}
			</Typography>
			<Typography mb={1}>{`L'interface est divisée en plusieurs zones :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Barre de menus (haut) : Fichier, Projet, Édition, Vue, Aide`}</li>
				<li>{`Barre d'outils (haut) : Accès rapide aux actions courantes et outils de création Grafcet ou Ladder`}</li>
				<li>{`Explorateur (gauche) : Arborescence des variables, grafcets et ladders du projet`}</li>
				<li>{`Zone principale (centre) : Onglets des pages ouvertes (grafcets, ladders, variables, propriétés). Cliquez sur un onglet pour l'activer, sur sa croix pour le fermer.`}</li>
				<li>{`Panneau inférieur : Tables de surveillance (simulation) et résultats d'analyse`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Menu Aide`}
			</Typography>
			<Typography mb={2}>
				{`Aide → Manuel utilisateur ouvre ce manuel dans un nouvel onglet. C'est pour l'instant la seule entrée de ce menu.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
