import ErrorTooltip from "@/lib/mui/tooltip/ErrorTooltip";
import { GridEditInputCell, GridRenderEditCellParams } from "@mui/x-data-grid";

function EditInputCell(props: GridRenderEditCellParams) {
	const { error } = props;

	return (
		<ErrorTooltip open={!!error} title={error}>
			<GridEditInputCell {...props} />
		</ErrorTooltip>
	);
}

export default EditInputCell;
