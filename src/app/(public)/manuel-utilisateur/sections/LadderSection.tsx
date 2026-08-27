import { Divider, Typography } from "@mui/material";

export default function LadderSection({ selected }: { selected: string }) {
	const isChild = selected.startsWith("ladder-");

	return (
		<section id="ladder">
			<Typography variant="h2" mb={3}>
				{`Ladder`}
			</Typography>
			<Typography mb={2}>
				{`Le ladder (schéma à contacts) est une notation graphique représentant la logique du programme sous forme de circuits électriques : des contacts en série ou en parallèle commandent des bobines. Studomate permet de créer et de modifier des ladders à l'aide d'un éditeur graphique interactif, dans un onglet séparé du grafcet.`}
			</Typography>
			<Typography mb={2}>
				{`Un projet contient toujours un ladder spécial appelé "Main". C'est le point d'entrée de l'exécution : il est lancé en premier à chaque cycle PLC et orchestre les autres ladders via des blocs d'appel de programme. Le ladder Main ne peut pas être supprimé.`}
			</Typography>
			<Typography mb={2}>
				{`Copier / Couper / Coller (Ctrl+C, Ctrl+X, Ctrl+V) fonctionnent sur la sélection courante dans un réseau.`}
			</Typography>

			{(!isChild || selected === "ladder-sections") && (
				<article id="ladder-sections">
					<Typography variant="h3" mb={2}>
						{`Réseaux`}
					</Typography>
					<Typography mb={2}>
						{`Un ladder est composé d'un ou plusieurs réseaux (aussi appelés "sections"), empilés verticalement. Chaque réseau porte son propre circuit, indépendant des autres.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Bouton "Section" dans la barre d'outils ladder : ajoute un nouveau réseau vide.`}</li>
						<li>{`Titre du réseau : cliquez dedans pour le modifier (Entrée valide, Échap annule).`}</li>
						<li>{`Description (optionnelle) : zone de texte libre sous le titre, pour documenter le réseau.`}</li>
						<li>{`Poignée à gauche du titre : glissez-la pour réordonner les réseaux (visible uniquement s'il y en a plus d'un).`}</li>
						<li>{`Flèche à gauche du titre : replie ou déplie le réseau.`}</li>
						<li>{`Icône corbeille : supprime le réseau. Désactivée s'il n'en reste qu'un seul — un ladder porte toujours au moins un réseau.`}</li>
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "ladder-contacts") && (
				<article id="ladder-contacts">
					<Typography variant="h3" mb={2}>
						{`Contacts`}
					</Typography>
					<Typography mb={2}>
						{`Un contact teste l'état d'une variable booléenne et transmet ou non l'alimentation du rail à sa droite.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`NO (normalement ouvert) — transmet lorsque la variable est vraie.`}</li>
						<li>{`NF (normalement fermé, barre diagonale) — transmet lorsque la variable est fausse.`}</li>
						<li>{`P (front montant) — transmet une seule fois, au passage de la variable de faux à vrai.`}</li>
						<li>{`N (front descendant) — transmet une seule fois, au passage de la variable de vrai à faux.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Faites glisser le symbole depuis la barre d'outils ladder sur la grille du réseau pour poser un contact. Double-cliquez dessus pour choisir la variable associée (aucune vérification de type n'est imposée à la saisie : une variable incompatible sera signalée par l'analyse, pas bloquée à la pose). En simulation, le contact change de couleur lorsque la variable qu'il teste vaut vrai.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "ladder-coils") && (
				<article id="ladder-coils">
					<Typography variant="h3" mb={2}>
						{`Bobines`}
					</Typography>
					<Typography mb={2}>
						{`Une bobine affecte une variable booléenne en sortie d'un circuit de contacts.`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Normale — la variable prend l'état du circuit qui alimente la bobine (vrai si alimentée, faux sinon).`}</li>
						<li>{`Set (S) — force la variable à VRAI lorsque le circuit est alimenté ; ne la remet jamais à FAUX.`}</li>
						<li>{`Reset (R) — force la variable à FAUX lorsque le circuit est alimenté ; ne la met jamais à VRAI.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Comme pour les contacts, la variable se choisit par double-clic sur la bobine. En simulation, une bobine alimentée est mise en évidence.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "ladder-blocks") && (
				<article id="ladder-blocks">
					<Typography variant="h3" mb={2}>
						{`Blocs`}
					</Typography>
					<Typography mb={2}>
						{`Les blocs sont des éléments fonctionnels avancés qui s'insèrent dans un réseau comme un contact ou une bobine. Ils sont disponibles dans la section "Blocs systèmes" de l'explorateur : faites glisser un bloc vers le canvas pour l'insérer — une fenêtre de configuration s'ouvre automatiquement.`}
					</Typography>
					<Typography mb={2}>
						{`Pour reconfigurer un bloc existant : double-cliquez dessus ou clic droit → Configurer.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Temporisation`}</Typography>
					<Typography mb={2}>
						{`Mesure une durée et expose un signal de sortie. Trois variantes :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`TON — retard à l'enclenchement : la sortie Q passe à vrai après que l'entrée IN est vraie pendant la durée PT.`}</li>
						<li>{`TOF — retard au déclenchement : la sortie Q reste vraie pendant PT après que IN est passée à faux.`}</li>
						<li>{`TP — impulsion calibrée : la sortie Q est vraie pendant exactement PT après un front montant sur IN.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Configuration : nom (unique dans le projet) et variante (TON/TOF/TP). Les paramètres PT (durée de consigne, ex. T#5s) et ET (durée écoulée en sortie, optionnelle) se renseignent directement sur les pinoches du bloc dans le canvas, sous forme de variable ou de constante TIME.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Compteur`}</Typography>
					<Typography mb={2}>
						{`Compte des impulsions. Deux variantes :`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`CTU — compte vers le haut : incrémente CV à chaque cycle où IN est vrai ; R remet CV à zéro.`}</li>
						<li>{`CTD — compte vers le bas : décrémente CV à chaque cycle où CD est vrai ; LD charge PV dans CV.`}</li>
					</Typography>
					<Typography mb={2}>
						{`La sortie Q passe à vrai lorsque CV atteint PV (CTU) ou descend à zéro (CTD). Configuration : nom et variante. PV (valeur de consigne) et la variable de contrôle (R ou LD) se renseignent sur les pinoches.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Comparaison`}</Typography>
					<Typography mb={2}>
						{`Évalue une expression de comparaison (ex. "vitesse >= 100") et transmet l'alimentation si le résultat est vrai. S'insère dans un réseau comme un contact. L'expression se saisit par double-clic ou clic droit → Configurer.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Affectation`}</Typography>
					<Typography mb={2}>
						{`Évalue une expression d'affectation (ex. "compteur := compteur + 1") lorsque le circuit qui l'alimente est vrai. S'insère en fin de réseau comme une bobine. L'expression se saisit par double-clic ou clic droit → Configurer.`}
					</Typography>
					<Typography variant="h5" mb={1}>{`Appel de programme`}</Typography>
					<Typography mb={2}>
						{`Appelle un autre ladder depuis le ladder Main. Le ladder ciblé s'exécute à chaque cycle où l'entrée EN est vraie. C'est le mécanisme par lequel le Main orchestre les autres ladders du projet — un ladder non appelé par le Main ne sera jamais exécuté (l'analyse le signale comme avertissement).`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}

			{(!isChild || selected === "ladder-connections") && (
				<article id="ladder-connections">
					<Typography variant="h3" mb={2}>
						{`Connexions`}
					</Typography>
					<Typography mb={2}>
						{`Un réseau est alimenté par le rail à gauche (trait vertical). Les éléments se relient entre eux en glissant depuis un point de connexion vers l'élément cible ; le validateur de connexions empêche les liaisons invalides (ex. relier deux bobines entre elles).`}
					</Typography>
					<Typography component="ul" sx={{ pl: 3 }} mb={2}>
						<li>{`Enchaînement simple (contacts à la suite sur une même ligne) : ET logique.`}</li>
						<li>{`Divergence (une connexion qui se sépare en plusieurs branches) : OU logique entre les branches.`}</li>
						<li>{`Convergence (plusieurs branches qui se rejoignent) : referme le OU ouvert par la divergence correspondante.`}</li>
					</Typography>
					<Typography mb={2}>
						{`Clic droit sur le fond du réseau : "Tout sélectionner" (Ctrl+A) ou "Sélectionner les liaisons". Clic droit sur un élément ou une liaison : "Supprimer".`}
					</Typography>
					<Typography mb={2}>
						{`En simulation, les liaisons alimentées sont mises en évidence, ce qui permet de suivre visuellement le flux d'alimentation dans chaque réseau.`}
					</Typography>
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
