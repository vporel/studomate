"use client";

import { Box, Divider, Typography } from "@mui/material";

export default function ManualSections({ selected }: { selected: string }) {
	const isGrafcetChild = selected?.startsWith("grafcet-");

	return (
		<Box sx={{ flex: 1 }}>
			{selected === "intro" && (
				<section id="intro">
					<Typography variant="h2" mb={3}>
						Introduction
					</Typography>
					<Typography>
						Studomate est un éditeur graphique basé sur Grafcet qui permet de créer, modifier et
						exporter des diagrammes. Il fournit un éditeur de nodes/edges, un explorateur de
						projets, la gestion des variables et des outils pour sauvegarder et exporter vos
						travaux.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}

			{selected === "getting-started" && (
				<section id="getting-started">
					<Typography variant="h2" mb={3}>
						Démarrer
					</Typography>
					<Typography>
						- Créer un nouveau projet via l'interface de projets.
						<br />- Ouvrir un projet existant; le canvas et l'explorateur se mettront à jour.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}

			{selected === "projects" && (
				<section id="projects">
					<Typography variant="h2" mb={3}>
						Projets
					</Typography>
					<Typography>
						La section Projets permet d'ouvrir, créer, exporter et gérer les propriétés du projet.
						Les projets sont persistés dans le localStorage ou via votre système de fichiers selon
						l'intégration.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}

			{/* Insert Grafcet parent + subsections */}

			{(selected === "grafcet" || isGrafcetChild) && (
				<section id="grafcet">
					<Typography variant="h2" mb={3}>
						Grafcet
					</Typography>

					{(selected === "grafcet" || selected === "grafcet-steps") && (
						<article id="grafcet-steps">
							<Typography variant="h3" mb={2}>
								Étapes
							</Typography>
							<Typography>
								Les étapes représentent les états du grafcet. Elles peuvent être ajoutées,
								renommées et liées par des transitions. Chaque étape a des propriétés
								(identifiant, nom, variables associées).
							</Typography>
							<Divider sx={{ my: 2 }} />
						</article>
					)}

					{(selected === "grafcet" || selected === "grafcet-actions") && (
						<article id="grafcet-actions">
							<Typography variant="h3" mb={2}>
								Actions
							</Typography>
							<Typography>
								Les actions sont des opérations associées aux étapes. Elles peuvent contenir
								une simple description textuelle ou manipuler des variables.
							</Typography>
							<Divider sx={{ my: 1 }} />
							<Typography variant="h5" mb={2}>
								Types d'actions
							</Typography>
							<Typography>
								• Texte — action avec une expression textuelle.
								<br />• Variable booléenne — Contient une ou plusieurs variables booléennes
								avec des valeurs qui seront appliquées selon le mode d'exécution. Si une
								variable booléenne est écrite sans assignation explicite (ex: "var1" au lieu
								de "var1 := 1"), elle sera considérée comme une mise à 1.
								<br />• Variable numérique — Contient une ou plusieurs variables numériques
								(int, real, ...) avec des valeurs qui seront appliquées selon le mode
								d'exécution.
								<br />• Variable chaîne de caractères — Contient une ou plusieurs variables de
								type string avec des valeurs qui seront appliquées selon le mode d'exécution.
								<br />
								<br />
								Dans l'interface, le type texte est représenté par une bordure fine, tandis
								que les types variables ont une bordure plus épaisse. La bordure épaisse
								indique qu'une validation sera appliquée sur l'expression de l'action pour
								vérifier la syntaxe et la cohérence des variables utilisées.
							</Typography>
							<Divider sx={{ my: 1 }} />
							<Typography variant="h5" mb={2}>
								Modes d'exécution
							</Typography>
							<Typography>
								• Continue — l'action s'exécute tant que l'étape est active.
								<br />• Front montant — l'action s'exécute uniquement au moment où l'étape
								devient active.
								<br />• Front descendant — l'action s'exécute uniquement au moment où l'étape
								devient inactive.
								<br />• Set — pour les actions de type Set, met la variable à 1 (valable
								uniquement pour les variables booléennes).
								<br />• Reset — pour les actions de type Reset, met la variable à 0 (valable
								uniquement pour les variables booléennes).
							</Typography>
							<Divider sx={{ my: 2 }} />
						</article>
					)}

					{(selected === "grafcet" || selected === "grafcet-transitions") && (
						<article id="grafcet-transitions">
							<Typography variant="h3" mb={2}>
								Transitions
							</Typography>
							<Typography>
								Les transitions relient les étapes et définissent les conditions de passage.
								Elles peuvent être configurées via l'éditeur et combinées avec des actions.
							</Typography>
							<Divider sx={{ my: 2 }} />
						</article>
					)}
				</section>
			)}

			{selected === "toolbar" && (
				<section id="toolbar">
					<Typography variant="h2" mb={3}>
						Barre d'outils
					</Typography>
					<Typography>
						La toolbar contient des actions fréquentes : sauvegarder, undo/redo, création rapide
						d'éléments et accès aux paramètres du projet.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}

			{selected === "explorer" && (
				<section id="explorer">
					<Typography variant="h2" mb={3}>
						Explorateur
					</Typography>
					<Typography>
						L'explorateur liste les éléments du projet (grafcets, variables, documents). Il
						propose un menu contextuel pour actions rapides.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}

			{selected === "variables" && (
				<section id="variables">
					<Typography variant="h2" mb={3}>
						Variables
					</Typography>
					<Typography>
						La gestion des variables permet de définir et réutiliser des variables dans vos
						diagrammes. Vous pouvez éditer, ajouter et supprimer des variables depuis la page
						Variables.
					</Typography>
					<Divider sx={{ my: 2 }} />
				</section>
			)}
		</Box>
	);
}
