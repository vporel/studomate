import { Divider, Typography } from "@mui/material";

export default function SimulationSection() {
	return (
		<section id="simulation">
			<Typography variant="h2" mb={3}>
				{`Simulation`}
			</Typography>
			<Typography mb={2}>
				{`Le mode Simulation permet d'exécuter le grafcet comme un automate programmable (PLC) avec évaluation en temps réel des réceptivités et des actions.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Démarrer la simulation`}
			</Typography>
			<Typography mb={2}>
				{`Sélectionnez "Simulation" dans le sélecteur de mode (en haut à droite). Avant le démarrage :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Le projet est analysé automatiquement.`}</li>
				<li>{`Les variables internes d'état des étapes sont générées.`}</li>
				<li>{`Le projet est compilé en routines PLC exécutables.`}</li>
				<li>{`Le cycle PLC démarre (temps de cycle par défaut : 100 ms).`}</li>
			</Typography>
			<Typography mb={2}>
				{`Si des erreurs sont détectées lors de l'analyse, la simulation ne démarrera pas.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Pendant la simulation`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Les étapes actives sont mises en évidence sur le canvas.`}</li>
				<li>{`Les réceptivités des transitions sont évaluées à chaque cycle.`}</li>
				<li>{`Les actions des étapes actives sont appliquées.`}</li>
				<li>{`Les valeurs des variables sont mises à jour en temps réel.`}</li>
				<li>{`Le canvas est en lecture seule : l'édition du grafcet est désactivée.`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Tables de visualisation et de modification des variables`}
			</Typography>
			<Typography mb={2}>
				{`Le panneau inférieur affiche les tables de visualisation et de modification des variables avec trois onglets :`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Entrées — valeurs actuelles des variables d'entrée`}</li>
				<li>{`Sorties — valeurs actuelles des variables de sortie`}</li>
				<li>{`Mémoires — valeurs actuelles des variables mémoire`}</li>
			</Typography>
			<Typography mb={2}>
				{`Les valeurs se mettent à jour après chaque cycle PLC. Vous pouvez modifier les valeurs des variables d'entrée directement depuis la table de surveillance pour simuler des signaux externes.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Arrêter la simulation`}
			</Typography>
			<Typography mb={2}>
				{`Repassez en mode "Conception" via le sélecteur de mode. Le cycle PLC s'arrête et l'édition du grafcet est à nouveau disponible.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
