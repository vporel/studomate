import ErrorTooltip from "@/ui/lib/mui/tooltip/ErrorTooltip";
import { GridEditInputCell, GridRenderEditCellParams } from "@mui/x-data-grid";

function EditInputCell(props: GridRenderEditCellParams) {
	const { error } = props;

	// `debounceMs={0}` : `onRowEditStop` de `VariablesTable` s'exécute en priorité `isFirst`,
	// donc avant que la grille ne vide sa file de saisie différée. Avec le debounce par défaut
	// (200 ms), valider avec Entrée juste après une frappe fait lire une valeur périmée (derniers
	// caractères perdus) et laisse la ligne coincée en édition (`isProcessingProps` encore vrai).
	return (
		<ErrorTooltip open={!!error} title={error}>
			<GridEditInputCell {...props} debounceMs={0} />
		</ErrorTooltip>
	);
}

export default EditInputCell;
