import { Divider, Typography } from "@mui/material";

export default function AnalysisSection({ selected }: { selected: string }) {
	const isChild = selected.startsWith("analysis-");

	return (
		<section id="analysis">
			<Typography variant="h2" mb={3}>
				{`Analyse`}
			</Typography>
			<Typography mb={2}>
				{`L'analyse statique vérifie la cohérence et la validité du projet avant la simulation. Elle détecte les erreurs bloquantes et les avertissements.`}
			</Typography>

			{(!isChild || selected === "analysis-run") && (
				<article id="analysis-run">
					<Typography variant="h3" mb={2}>
						{`Lancer l'analyse`}
					</Typography>
					<Typography mb={2}>
						{`Cliquez sur le bouton "Analyser" dans la barre d'outils. Le résultat s'affiche dans le panneau inférieur avec :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Le nombre total d'éléments analysés`}</li>
						<li>{`Le nombre d'erreurs et d'avertissements`}</li>
						<li>{`La liste des problèmes détectés par programme (grafcet ou ladder) et par élément`}</li>
					</Typography>
					<Typography mb={2}>
						{`Le bouton Analyser change de couleur : rouge si des erreurs sont présentes, orange pour des avertissements uniquement, neutre si aucun problème.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "analysis-checks") && (
				<article id="analysis-checks">
					<Typography variant="h3" mb={2}>
						{`Types de vérifications`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Structure du grafcet : liaisons manquantes, étapes isolées, transitions sans réceptivité`}</li>
						<li>{`Structure du ladder : réseaux et connexions invalides`}</li>
						<li>{`Expressions : syntaxe des réceptivités et des actions`}</li>
						<li>{`Variables : références à des variables inexistantes, types incompatibles`}</li>
						<li>{`Jonctions : validité des branches et connexions`}</li>
					</Typography>
					<Typography mb={2}>
						{`Cliquez sur un problème dans la liste pour naviguer vers l'élément concerné, dans le grafcet ou le ladder correspondant.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "analysis-messages") && (
				<article id="analysis-messages">
					<Typography variant="h3" mb={2}>
						{`Exemples de messages`}
					</Typography>
					<Typography mb={1}>{`Quelques messages fréquents et leur cause :`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`"La transition n'a pas d'expression. Elle ne pourra jamais être franchie." — le champ de réceptivité est vide.`}</li>
						<li>{`"Expression invalide : une transition doit être une expression retournant un booléen." — la réceptivité contient par exemple un calcul numérique au lieu d'une condition logique.`}</li>
						<li>{`"Une transition ne peut avoir qu'un seul successeur direct. Utilisez une divergence en ET pour activer plusieurs étapes simultanément." — plusieurs liaisons partent directement d'une même transition sans passer par une jonction.`}</li>
						<li>{`"L'action n'est connectée à aucune étape." — une action a été déposée sur le canvas sans être reliée à une étape.`}</li>
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
