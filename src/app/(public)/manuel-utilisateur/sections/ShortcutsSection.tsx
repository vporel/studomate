import { Divider, Typography } from "@mui/material";

export default function ShortcutsSection() {
	return (
		<section id="shortcuts">
			<Typography variant="h2" mb={3}>
				{`Raccourcis clavier`}
			</Typography>
			<Typography mb={2}>
				{`Les raccourcis ci-dessous utilisent Ctrl sur Windows/Linux et Cmd sur macOS.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Fichier`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Nouveau projet — aucun raccourci (Ctrl+N est réservé par le navigateur pour ouvrir une nouvelle fenêtre)`}</li>
				<li>{`Ctrl+O — Ouvrir projet`}</li>
				<li>{`Ctrl+S — Enregistrer`}</li>
				<li>{`Ctrl+Shift+S — Enregistrer sous (crée une copie du projet sous un nouveau nom)`}</li>
				<li>{`Ctrl+E — Exporter`}</li>
				<li>{`Ctrl+F4 (Windows/Linux) ou Cmd+W (macOS) — Fermer le projet`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Projet`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Ctrl+G — Nouveau grafcet`}</li>
				<li>{`Ctrl+L — Nouveau ladder`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Édition`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Ctrl+Z — Annuler`}</li>
				<li>{`Ctrl+Y — Rétablir`}</li>
				<li>{`Ctrl+C — Copier (canvas Grafcet, Ladder ou HMI actif)`}</li>
				<li>{`Ctrl+V — Coller (canvas Grafcet, Ladder ou HMI actif)`}</li>
				<li>{`Ctrl+X — Couper (canvas Grafcet, Ladder ou HMI actif)`}</li>
				<li>{`Ctrl+A — Sélectionner tout (canvas Grafcet, Ladder ou HMI actif)`}</li>
				<li>{`Suppr ou Retour arrière — Supprimer la sélection (canvas HMI actif)`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Explorateur`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`F2 — Renommer le grafcet ou le ladder sélectionné`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Édition en ligne`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Entrée — Valider la modification`}</li>
				<li>{`Échap — Annuler la modification`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
