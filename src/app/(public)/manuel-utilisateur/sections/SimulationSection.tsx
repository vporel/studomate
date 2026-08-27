import { Divider, Typography } from "@mui/material";

export default function SimulationSection({ selected }: { selected: string }) {
	const isChild = selected.startsWith("simulation-");

	return (
		<section id="simulation">
			<Typography variant="h2" mb={3}>
				{`Simulation`}
			</Typography>
			<Typography mb={2}>
				{`Le mode Simulation exécute le projet comme un automate programmable (PLC) : les ladders sont compilés en routines exécutées à chaque cycle, le grafcet évalue ses réceptivités et déclenche ses actions, et les interfaces HMI deviennent interactives.`}
			</Typography>

			{(!isChild || selected === "simulation-start") && (
				<article id="simulation-start">
					<Typography variant="h3" mb={2}>
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
					<Typography mb={2}>
						{`Deux modes d'exécution sont disponibles dans le sélecteur à côté du sélecteur de mode :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Continu — le cycle PLC tourne automatiquement à intervalle régulier (100 ms). Un bouton Pause suspend l'exécution ; Reprendre la relance.`}</li>
						<li>{`Pas-à-pas — le cycle PLC n'avance que d'un cran à chaque clic sur le bouton "Étape". Utile pour observer précisément le comportement cycle par cycle.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Les temporisations suivent le temps réel écoulé, y compris en pas-à-pas : si vous laissez passer deux secondes entre deux clics sur "Étape", une temporisation de 2 s arrivera à échéance au clic suivant — inutile de cliquer autant de fois qu'il y a de cycles. Les temporisations ne se figent que dans un seul cas : le mode continu mis en pause. Elles reprennent alors là où elles s'étaient arrêtées, la durée de la pause n'étant pas comptée.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "simulation-running") && (
				<article id="simulation-running">
					<Typography variant="h3" mb={2}>
						{`Pendant la simulation`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Les étapes actives sont mises en évidence sur le canvas grafcet.`}</li>
						<li>{`Les réceptivités des transitions sont évaluées à chaque cycle.`}</li>
						<li>{`Les actions des étapes actives sont appliquées.`}</li>
						<li>{`Les contacts, bobines et liaisons énergisés sont mis en évidence dans les éditeurs ladder.`}</li>
						<li>{`Les valeurs des variables sont mises à jour en temps réel.`}</li>
						<li>{`Les éditeurs grafcet et ladder sont en lecture seule.`}</li>
						<li>{`L'onglet "Simulation HMI" s'ouvre automatiquement si le projet contient des pages HMI (voir la section Interfaces HMI).`}</li>
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "simulation-watch-tables") && (
				<article id="simulation-watch-tables">
					<Typography variant="h3" mb={2}>
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
						{`Les valeurs se mettent à jour après chaque cycle PLC. Vous pouvez modifier directement les valeurs des variables d'entrée et mémoire depuis la table pour simuler des signaux externes ou forcer un état interne. Les sorties sont affichées en lecture seule.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "simulation-stop") && (
				<article id="simulation-stop">
					<Typography variant="h3" mb={2}>
						{`Arrêter la simulation`}
					</Typography>
					<Typography mb={2}>
						{`Repassez en mode "Conception" via le sélecteur de mode. Le cycle PLC s'arrête et l'édition du grafcet est à nouveau disponible.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
