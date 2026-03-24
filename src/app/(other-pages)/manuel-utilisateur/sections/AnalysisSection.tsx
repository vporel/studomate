import { Divider, Typography } from "@mui/material";

export default function AnalysisSection() {
	return (
		<section id="analysis">
			<Typography variant="h2" mb={3}>
				{`Analyse`}
			</Typography>
			<Typography mb={2}>
				{`L'analyse statique vérifie la cohérence et la validité du projet avant la simulation. Elle détecte les erreurs bloquantes et les avertissements.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Lancer l'analyse`}
			</Typography>
			<Typography mb={2}>
				{`Cliquez sur le bouton "Analyser" dans la barre d'outils. Le résultat s'affiche dans le panneau inférieur avec :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Le nombre total d'éléments analysés`}</li>
				<li>{`Le nombre d'erreurs et d'avertissements`}</li>
				<li>{`La liste des problèmes détectés par grafcet et par élément`}</li>
			</Typography>
			<Typography mb={2}>
				{`Le bouton Analyser change de couleur : rouge si des erreurs sont présentes, orange pour des avertissements uniquement, neutre si aucun problème.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Types de vérifications`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Structure du grafcet : liaisons manquantes, étapes isolées, transitions sans réceptivité`}</li>
				<li>{`Expressions : syntaxe des réceptivités et des actions`}</li>
				<li>{`Variables : références à des variables inexistantes, types incompatibles`}</li>
				<li>{`Jonctions : validité des branches et connexions`}</li>
			</Typography>
			<Typography mb={2}>
				{`Cliquez sur un problème dans la liste pour naviguer vers l'élément concerné dans le grafcet.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
