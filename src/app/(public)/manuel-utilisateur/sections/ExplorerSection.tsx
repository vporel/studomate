import { Divider, Typography } from "@mui/material";

export default function ExplorerSection() {
	return (
		<section id="explorer">
			<Typography variant="h2" mb={3}>
				{`Explorateur`}
			</Typography>
			<Typography mb={2}>
				{`L'explorateur est un panneau latéral gauche affichant l'arborescence du projet. Il peut être affiché ou masqué via le menu Vue → Explorateur.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Structure de l'explorateur`}
			</Typography>
			<Typography
				mb={1}
			>{`L'explorateur est organisé en cinq sections :`}</Typography>
			<Typography mb={1}>{`Variables :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Entrées logiques — variables booléennes d'entrée`}</li>
				<li>{`Entrées analogiques — variables numériques d'entrée (INT, WORD, DWORD)`}</li>
				<li>{`Sorties logiques — variables booléennes de sortie`}</li>
				<li>{`Sorties analogiques — variables numériques de sortie (INT, WORD, DWORD)`}</li>
				<li>{`Mémoires — variables internes (tous types)`}</li>
			</Typography>
			<Typography mb={1}>{`Programmes :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Liste de tous les grafcets et ladders du projet, chacun distingué par une icône propre à son type.`}</li>
			</Typography>
			<Typography mb={1}>{`Instances de blocs :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Apparaît uniquement lorsque le projet contient au moins un bloc temporisateur ou compteur. Liste toutes les instances nommées, avec un menu contextuel permettant de les configurer ou d'accéder au ladder qui les contient.`}</li>
			</Typography>
			<Typography mb={1}>{`Blocs systèmes :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Palette des blocs disponibles pour l'éditeur ladder : Temporisation, Compteur, Comparaison, Affectation, Calcul. Faites glisser un bloc depuis cette section vers le canvas d'un ladder pour l'insérer.`}</li>
			</Typography>
			<Typography mb={1}>{`Interfaces HMI :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Liste de toutes les pages HMI du projet. La page principale est identifiée par le badge "Principale". Clic droit sur le dossier : créer une nouvelle page. Clic droit sur une page : Ouvrir, Renommer (F2), Supprimer.`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Actions disponibles`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Cliquer sur une section de variables : ouvre la page de gestion de ces variables`}</li>
				<li>{`Cliquer sur un grafcet ou un ladder : ouvre son onglet`}</li>
				<li>{`Double-cliquer sur le nom d'un programme : édition inline du nom`}</li>
				<li>{`Clic droit sur un programme → Ouvrir, Renommer (F2), Supprimer`}</li>
				<li>{`Clic droit sur zone vide → Masquer l'explorateur`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
