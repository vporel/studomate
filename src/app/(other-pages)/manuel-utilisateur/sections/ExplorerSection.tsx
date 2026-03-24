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
			<Typography mb={1}>{`L'explorateur est organisé en deux sections principales :`}</Typography>
			<Typography mb={1}>{`Variables :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Entrées logiques — variables booléennes d'entrée`}</li>
				<li>{`Entrées analogiques — variables numériques d'entrée (INT, WORD, DWORD)`}</li>
				<li>{`Sorties logiques — variables booléennes de sortie`}</li>
				<li>{`Sorties analogiques — variables numériques de sortie (INT, WORD, DWORD)`}</li>
				<li>{`Mémoires — variables internes (tous types)`}</li>
			</Typography>
			<Typography mb={1}>{`Grafcets :`}</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Liste de tous les grafcets du projet`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Actions disponibles`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Cliquer sur une section de variables : ouvre la page de gestion de ces variables`}</li>
				<li>{`Cliquer sur un grafcet : ouvre l'onglet de ce grafcet`}</li>
				<li>{`Double-cliquer sur le nom d'un grafcet : édition inline du nom`}</li>
				<li>{`Clic droit sur un grafcet → Ouvrir, Renommer (F2), Supprimer`}</li>
				<li>{`Clic droit sur zone vide → Masquer l'explorateur`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
