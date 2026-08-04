import { Divider, Typography } from "@mui/material";

export default function GrafcetSection({ selected }: { selected: string }) {
	const isChild = selected.startsWith("grafcet-");

	return (
		<section id="grafcet">
			<Typography variant="h2" mb={3}>
				{`Grafcet`}
			</Typography>
			<Typography mb={2}>
				{`Un grafcet est un diagramme fonctionnel représentant le comportement séquentiel d'un système automatisé. Studomate permet de créer et de modifier des grafcets à l'aide d'un éditeur graphique interactif.`}
			</Typography>

			{(!isChild || selected === "grafcet-canvas") && (
				<article id="grafcet-canvas">
					<Typography variant="h3" mb={2}>
						{`Canvas`}
					</Typography>
					<Typography mb={2}>
						{`Le canvas est la zone de travail principale du grafcet. Il offre les interactions suivantes :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Glisser-déposer depuis la barre d'outils pour créer des éléments`}</li>
						<li>{`Cliquer sur un élément pour le sélectionner`}</li>
						<li>{`Ctrl+clic (ou Cmd+clic) pour sélectionner plusieurs éléments`}</li>
						<li>{`Cliquer-glisser sur une zone vide pour sélectionner plusieurs éléments par zone`}</li>
						<li>{`Déplacer les éléments sélectionnés en les faisant glisser`}</li>
						<li>{`Glisser depuis un point de connexion pour créer une liaison`}</li>
						<li>{`Molette de la souris (avec Ctrl/Cmd) pour zoomer`}</li>
						<li>{`Clic droit sur le canvas pour afficher le menu contextuel`}</li>
					</Typography>
					<Typography mb={2}>
						{`Les éléments se positionnent sur une grille pour faciliter l'alignement. En mode Simulation, le canvas passe en lecture seule.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-steps") && (
				<article id="grafcet-steps">
					<Typography variant="h3" mb={2}>
						{`Étapes`}
					</Typography>
					<Typography mb={2}>
						{`Les étapes représentent les états stables du système. Une étape peut être active ou inactive à tout moment de l'exécution.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Types d'étapes`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Étape initiale : étape active au démarrage du grafcet, représentée avec une double bordure`}</li>
						<li>{`Étape normale : étape standard`}</li>
					</Typography>
					<Typography variant="h5" mb={1}>{`Propriétés`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Identifiant numérique : numéro unique de l'étape (ex : 1, 2, 3…)`}</li>
						<li>{`Nom : libellé affiché sur l'étape`}</li>
					</Typography>
					<Typography mb={2}>
						{`Pour modifier le nom ou le numéro d'une étape, double-cliquez sur le champ correspondant. En simulation, les étapes actives sont mises en évidence visuellement.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-transitions") && (
				<article id="grafcet-transitions">
					<Typography variant="h3" mb={2}>
						{`Transitions`}
					</Typography>
					<Typography mb={2}>
						{`Les transitions définissent les conditions de passage d'une étape à la suivante. Une transition est franchie lorsque toutes les étapes amont sont actives ET que sa réceptivité est vraie.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Réceptivité`}</Typography>
					<Typography mb={2}>
						{`La réceptivité est une expression booléenne saisie dans le champ de la transition. Elle peut faire référence à des variables du projet, à des constantes, ou à des combinaisons logiques (ET, OU, NON).`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Exemple : "capteur1 ET NON capteur2"`}</li>
						<li>{`Réceptivité toujours vraie : écrire 'VRAI'`}</li>
					</Typography>
					<Typography mb={2}>
						{`Pour modifier la réceptivité, double-cliquez sur la zone de texte de la transition. La syntaxe est vérifiée lors de l'analyse du projet.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-actions") && (
				<article id="grafcet-actions">
					<Typography variant="h3" mb={2}>
						{`Actions`}
					</Typography>
					<Typography mb={2}>
						{`Les actions sont des blocs liés aux étapes qui décrivent ce que fait le système lorsqu'une étape est active. Une étape peut avoir plusieurs actions.`}
					</Typography>
					<Divider sx={{ my: 1 }} />
					<Typography variant="h5" mb={1}>
						{`Types d'actions`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Texte — description textuelle libre, sans exécution ni vérification syntaxique. Représentée par une bordure fine.`}</li>
						<li>{`Variable booléenne — manipule une ou plusieurs variables de type BOOL. La bordure est épaisse ; la syntaxe et la cohérence des variables sont vérifiées. Si une variable booléenne est écrite sans assignation explicite (ex : "var1" au lieu de "var1 := 1"), elle est considérée comme une mise à 1.`}</li>
						<li>{`Variable numérique — manipule des variables numériques (INT, REAL, etc.). Bordure épaisse avec validation.`}</li>
						<li>{`Variable chaîne de caractères — manipule des variables de type STRING. Bordure épaisse avec validation.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Le type d'une action se modifie via le clic droit → Type.`}
					</Typography>
					<Divider sx={{ my: 1 }} />
					<Typography variant="h5" mb={1}>
						{`Modes d'exécution`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Continue (C) — l'action s'exécute tant que l'étape est active.`}</li>
						<li>{`Front montant (↗) — l'action s'exécute une seule fois au moment où l'étape devient active.`}</li>
						<li>{`Front descendant (↘) — l'action s'exécute une seule fois au moment où l'étape devient inactive.`}</li>
						<li>{`Set (S) — force la variable booléenne à VRAI (disponible uniquement pour les actions de type variable booléenne).`}</li>
						<li>{`Reset (R) — force la variable booléenne à FAUX (disponible uniquement pour les actions de type variable booléenne).`}</li>
					</Typography>
					<Typography mb={2}>
						{`Le mode d'exécution se modifie via le clic droit → Mode d'exécution. Les modes disponibles dépendent du type de l'action.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-junctions") && (
				<article id="grafcet-junctions">
					<Typography variant="h3" mb={2}>
						{`Jonctions`}
					</Typography>
					<Typography mb={2}>
						{`Les jonctions permettent de modéliser des séquences parallèles ou alternatives dans le grafcet.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Types de jonctions`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Divergence en ET — divise le flux en plusieurs branches parallèles qui s'exécutent simultanément.`}</li>
						<li>{`Convergence en ET — synchronise plusieurs branches parallèles et reprend un flux unique.`}</li>
						<li>{`Divergence en OU — crée des branches alternatives, une seule peut être active.`}</li>
						<li>{`Convergence en OU — regroupe des branches alternatives.`}</li>
					</Typography>
					<Typography variant="h5" mb={1}>{`Branches`}</Typography>
					<Typography mb={2}>
						{`Chaque jonction possède un point pivot et plusieurs branches. Via le clic droit sur une jonction, vous pouvez :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Sélectionner le pivot`}</li>
						<li>{`Sélectionner une branche spécifique`}</li>
						<li>{`Supprimer une branche (impossible si seulement 2 branches restent)`}</li>
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-referrals") && (
				<article id="grafcet-referrals">
					<Typography variant="h3" mb={2}>
						{`Renvois`}
					</Typography>
					<Typography mb={2}>
						{`Les renvois permettent de relier des parties éloignées d'un grafcet sans tracer une longue liaison, ou de référencer des étapes situées dans une autre zone du diagramme.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Tenant (Source de renvoi) — point de départ du renvoi, indique l'étape cible.`}</li>
						<li>{`Aboutissant (Cible de renvoi) — point d'arrivée du renvoi, indique l'étape source.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Un tenant et un aboutissant se correspondent par leur numéro d'étape référencé.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-comments") && (
				<article id="grafcet-comments">
					<Typography variant="h3" mb={2}>
						{`Commentaires`}
					</Typography>
					<Typography mb={2}>
						{`Les commentaires sont des annotations textuelles libres placées sur le canvas. Ils n'ont aucun effet sur l'exécution et servent uniquement à documenter le diagramme.`}
					</Typography>
					<Typography mb={2}>
						{`Pour modifier le texte d'un commentaire, double-cliquez dessus.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "grafcet-connections") && (
				<article id="grafcet-connections">
					<Typography variant="h3" mb={2}>
						{`Liaisons`}
					</Typography>
					<Typography mb={2}>
						{`Les liaisons relient les éléments entre eux et définissent l'ordre d'exécution du grafcet. Elles matérialisent le flux de contrôle.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Créer une liaison`}</Typography>
					<Typography mb={2}>
						{`Survolez un élément pour faire apparaître ses points de connexion, puis faites glisser depuis un point de connexion vers l'élément cible.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Règles de connexion`}</Typography>
					<Typography mb={2}>
						{`Le validateur de connexions empêche les liaisons invalides. Les connexions autorisées suivent la logique Grafcet :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Étape → Transition`}</li>
						<li>{`Transition → Étape`}</li>
						<li>{`Jonction divergence → Branche → Étape ou Transition`}</li>
						<li>{`Étape ou Transition → Branche → Jonction convergence`}</li>
						<li>{`Étape → Action`}</li>
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
