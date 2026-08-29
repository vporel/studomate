import {
	HMI_WIDGET_DEFINITIONS,
	HmiWidgetKind,
	HmiWidgetType,
} from "@/schemas/hmi/hmi-widget.schema";
import { HMI_WIDGET_UI } from "@/ui/components/hmi/widgets/hmi-widget-ui";
import { Divider, Typography } from "@mui/material";

const WIDGET_TYPES = Object.keys(HMI_WIDGET_DEFINITIONS) as HmiWidgetType[];

function widgetTypesByKind(kind: HmiWidgetKind): HmiWidgetType[] {
	return WIDGET_TYPES.filter(
		(type) => HMI_WIDGET_DEFINITIONS[type].kind === kind,
	).sort((a, b) => HMI_WIDGET_UI[a].paletteOrder - HMI_WIDGET_UI[b].paletteOrder);
}

export default function HmiSection({ selected }: { selected: string }) {
	const isChild = selected.startsWith("hmi-");

	return (
		<section id="hmi">
			<Typography variant="h2" mb={3}>
				{`Interfaces HMI`}
			</Typography>
			<Typography mb={2}>
				{`Une interface HMI (Human-Machine Interface) est une page graphique interactive permettant de visualiser et de piloter le système en simulation. Un projet peut contenir plusieurs pages HMI ; l'une d'elles est désignée comme page principale et s'affiche à l'entrée en simulation.`}
			</Typography>

			{(!isChild || selected === "hmi-pages") && (
				<article id="hmi-pages">
					<Typography variant="h3" mb={2}>
						{`Pages HMI`}
					</Typography>
					<Typography mb={2}>
						{`Les pages HMI se gèrent depuis l'explorateur, dans la section "Interfaces HMI".`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Créer une page : clic droit sur le dossier "Interfaces HMI" → "Nouvelle page HMI". Disponible uniquement en mode conception.`}</li>
						<li>{`Ouvrir une page : clic simple sur son nom, ou clic droit → Ouvrir.`}</li>
						<li>{`Renommer : double-clic sur le nom dans l'explorateur, ou clic droit → Renommer (F2). Un nom vide est ignoré.`}</li>
						<li>{`Supprimer : clic droit → Supprimer (confirmation demandée).`}</li>
					</Typography>
					<Typography mb={2}>
						{`La page principale porte le badge "Principale" à droite de son nom. Pour désigner une page comme principale : ouvrez-la, cliquez sur une zone vide du canvas pour afficher les propriétés de la page dans le panneau latéral droit, puis cliquez sur "Définir en page principale".`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-canvas") && (
				<article id="hmi-canvas">
					<Typography variant="h3" mb={2}>
						{`Canvas`}
					</Typography>
					<Typography mb={2}>
						{`Le canvas est la zone de travail d'une page HMI (1000 × 640 px). Les widgets s'y positionnent librement et se magnétisent automatiquement sur une grille de 10 px.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Zoom`}</Typography>
					<Typography mb={2}>
						{`Les boutons de zoom (+/−) et l'indicateur de pourcentage (cliquer pour revenir à 100 %) se trouvent dans la barre d'outils en haut de la page. Ctrl+molette zoome également depuis le canvas. Plage : 80 % – 200 %.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Placer un widget`}</Typography>
					<Typography mb={2}>
						{`Faites glisser l'icône du widget depuis la palette (barre d'outils en haut à gauche) vers le canvas. Le widget est centré sur le point de lâcher et immédiatement sélectionné.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Sélectionner`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Clic simple sur un widget : sélectionne ce widget.`}</li>
						<li>{`Clic sur zone vide : vide la sélection.`}</li>
						<li>{`Shift+clic ou Ctrl+clic : ajoute ou retire un widget de la sélection.`}</li>
						<li>{`Cliquer-glisser sur zone vide : rectangle de sélection — sélectionne tous les widgets qu'il intersecte.`}</li>
						<li>{`Ctrl+A : sélectionner tout.`}</li>
					</Typography>
					<Typography
						variant="h5"
						mb={1}
					>{`Déplacer et redimensionner`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Déplacer : cliquer-glisser sur un widget sélectionné. Un groupe entier se déplace en une seule commande annulable.`}</li>
						<li>{`Redimensionner : disponible uniquement pour un seul widget sélectionné. Une poignée bleue apparaît dans le coin inférieur droit ; faites-la glisser.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Copier / Couper / Coller (Ctrl+C, Ctrl+X, Ctrl+V) fonctionnent sur la sélection courante, via les raccourcis clavier ou le clic droit. Les widgets collés sont placés légèrement décalés par rapport à l'original.`}
					</Typography>
					<Typography mb={2}>
						{`Toutes les modifications sont annulables (Ctrl+Z / Ctrl+Y).`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-widgets") && (
				<article id="hmi-widgets">
					<Typography variant="h3" mb={2}>
						{`Widgets`}
					</Typography>
					<Typography mb={2}>
						{`${WIDGET_TYPES.length} types de widgets sont disponibles, répartis en deux groupes dans la palette.`}
					</Typography>
					<Typography
						variant="h5"
						mb={1}
					>{`Widgets interactifs (liés à une variable)`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						{widgetTypesByKind("interactive").map((type) => (
							<li key={type}>{HMI_WIDGET_UI[type].manualDescription}</li>
						))}
					</Typography>
					<Typography
						variant="h5"
						mb={1}
					>{`Formes (purement visuelles)`}</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						{widgetTypesByKind("shape").map((type) => (
							<li key={type}>{HMI_WIDGET_UI[type].manualDescription}</li>
						))}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-properties") && (
				<article id="hmi-properties">
					<Typography variant="h3" mb={2}>
						{`Propriétés`}
					</Typography>
					<Typography mb={2}>
						{`Lorsqu'un seul widget est sélectionné, le panneau latéral droit affiche ses propriétés.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Nom : identifiant unique du widget dans la page.`}</li>
						<li>{`Libellé : texte affiché sur le widget (pour les widgets interactifs).`}</li>
						<li>{`Variable liée : mnémonique de la variable associée. Le sélecteur est filtré selon le type de widget.`}</li>
						<li>{`Propriétés spécifiques au type : comportement (bouton), unité et décimales (affichage numérique), min/max (jauge, saisie numérique), couleurs et dimensions (formes).`}</li>
					</Typography>
					<Typography mb={2}>
						{`Le panneau "Objets" (en dessous de "Propriétés") liste tous les widgets de la page du plus haut au plus bas dans la pile d'empilement. Cliquez sur un nom pour sélectionner le widget correspondant.`}
					</Typography>
					<Typography mb={2}>
						{`L'ordre d'empilement (z-order) se modifie via le clic droit sur un widget : Avancer, Reculer, Mettre au premier plan, Mettre en arrière-plan.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-animations") && (
				<article id="hmi-animations">
					<Typography variant="h3" mb={2}>
						{`Animations`}
					</Typography>
					<Typography mb={2}>
						{`Les animations permettent de faire varier dynamiquement la position ou l'apparence d'un widget en fonction d'une variable, lors de la simulation. Cliquez sur le bouton "Animations" (icône réglages) en bas du panneau Propriétés pour ouvrir la fenêtre d'animations.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Animation de position`}</Typography>
					<Typography mb={2}>
						{`Disponible pour tous les types de widgets. Liez une variable numérique à l'axe X et/ou Y : en simulation, la valeur de la variable est ajoutée (en pixels) à la position de base du widget.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Animation de style`}</Typography>
					<Typography mb={2}>
						{`Disponible pour rectangle, ellipse et texte. Choisissez une variable pilote (BOOL ou numérique), puis définissez une table de correspondance valeur → propriétés de style :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Variable BOOL : deux lignes fixes (valeur 0 et valeur 1) — associez une couleur à chaque état.`}</li>
						<li>{`Variable numérique : lignes libres — ajoutez autant de valeurs que nécessaire, chacune associée à une couleur ou un texte.`}</li>
					</Typography>
					<Typography mb={2}>
						{`En simulation, la première ligne dont la valeur correspond exactement à la valeur courante de la variable pilote est appliquée. Si aucune ne correspond, le style statique du widget s'affiche.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-events") && (
				<article id="hmi-events">
					<Typography variant="h3" mb={2}>
						{`Événements`}
					</Typography>
					<Typography mb={2}>
						{`Les événements permettent de déclencher des actions lors d'interactions avec un widget en simulation. Cliquez sur le bouton "Événements" (icône éclair) en bas du panneau Propriétés pour ouvrir la fenêtre d'événements. Ce bouton n'apparaît que pour les widgets qui exposent des événements.`}
					</Typography>
					<Typography mb={2}>
						{`Actuellement, seul le bouton poussoir expose un événement : "Bouton pressé" (déclenché à chaque appui, indépendamment du comportement configuré).`}
					</Typography>
					<Typography mb={2}>
						{`Action disponible : "Changer de page" — navigue vers la page HMI choisie dans la vue Simulation HMI. Plusieurs actions peuvent être associées à un même événement et sont exécutées dans l'ordre.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "hmi-simulation") && (
				<article id="hmi-simulation">
					<Typography variant="h3" mb={2}>
						{`Simulation HMI`}
					</Typography>
					<Typography mb={2}>
						{`L'onglet "Simulation HMI" s'ouvre automatiquement au démarrage de la simulation (si le projet contient au moins une page HMI). Il affiche la page principale et se ferme à l'arrêt de la simulation.`}
					</Typography>
					<Typography mb={2}>
						{`En simulation, le canvas est en lecture/interaction seule : la palette, le panneau de propriétés et la sélection sont désactivés. Les widgets reflètent en temps réel les valeurs des variables du programme.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Bouton poussoir et interrupteur : interagissent avec leur variable liée selon leur comportement configuré.`}</li>
						<li>{`Saisie numérique : saisir une valeur et valider par Entrée ou en cliquant ailleurs l'écrit dans la variable.`}</li>
						<li>{`Voyant, affichage numérique, jauge : reflètent la valeur courante de leur variable.`}</li>
						<li>{`Animations de position et de style : actives en simulation.`}</li>
					</Typography>
					<Typography mb={2}>
						{`La navigation entre pages se fait via les événements de widgets configurés avec l'action "Changer de page" : la page affichée dans l'onglet change sans changer d'onglet.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
