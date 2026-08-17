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
						{`Comme pour les contacts, la variable se choisit par double-clic sur la bobine.`}
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
					<Divider sx={{ my: 2 }} />
				</article>
			)}
		</section>
	);
}
