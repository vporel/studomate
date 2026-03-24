import { Divider, Typography } from "@mui/material";

export default function VariablesSection() {
	return (
		<section id="variables">
			<Typography variant="h2" mb={3}>
				{`Variables`}
			</Typography>
			<Typography mb={2}>
				{`Les variables sont les données manipulées par le programme. Elles sont organisées en zones selon leur rôle dans le système. Chaque variable a un mnémonique unique qui sera utilisé dans les expressions des transitions et des actions.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Zones de variables`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Entrées logiques : signaux booléens provenant de l'extérieur (capteurs, boutons)`}</li>
				<li>{`Entrées analogiques : valeurs numériques provenant de l'extérieur`}</li>
				<li>{`Sorties logiques : signaux booléens envoyés vers l'extérieur (actionneurs, voyants)`}</li>
				<li>{`Sorties analogiques : valeurs numériques envoyées vers l'extérieur`}</li>
				<li>{`Mémoires : variables internes utilisées pour la logique interne`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Types de données`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`BOOL — booléen (vrai/faux), disponible dans toutes les zones`}</li>
				<li>{`INT — entier signé, disponible pour les analogiques et mémoires`}</li>
				<li>{`LONG — entier long signé, disponible dans les mémoires`}</li>
				<li>{`WORD — entier non signé 16 bits, disponible pour les analogiques et mémoires`}</li>
				<li>{`DWORD — entier non signé 32 bits, disponible pour les analogiques et mémoires`}</li>
				<li>{`REAL — nombre flottant, disponible dans les mémoires`}</li>
				<li>{`STRING — chaîne de caractères, disponible dans les mémoires`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Propriétés d'une variable`}
			</Typography>
			<Typography component="ul" sx={{ pl: 3 }} mb={2}>
				<li>{`Mnémonique (obligatoire) : nom de la variable, max 32 caractères, doit commencer par une lettre, caractères alphanumériques et underscores autorisés, doit être unique`}</li>
				<li>{`Zone : catégorie de la variable`}</li>
				<li>{`Type : type de données`}</li>
				<li>{`Adresse (optionnel) : adresse automate au format PLC (ex : %I0.0, %QW10, %MD100)`}</li>
				<li>{`Commentaire (optionnel) : description libre`}</li>
			</Typography>
			<Divider sx={{ my: 2 }} />
			<Typography variant="h4" mb={2}>
				{`Gestion des variables`}
			</Typography>
			<Typography mb={2}>
				{`Depuis la page Variables (accessible via l'explorateur ou le menu), vous pouvez ajouter, modifier et supprimer des variables. La modification et la suppression sont désactivées en mode Simulation.`}
			</Typography>
			<Divider sx={{ my: 2 }} />
		</section>
	);
}
