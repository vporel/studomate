import { styled } from "@mui/material/styles";
import Tooltip, { tooltipClasses, TooltipProps } from "@mui/material/Tooltip";
import { GridEditInputCell, GridRenderEditCellParams } from "@mui/x-data-grid";

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
	<Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
	[`& .${tooltipClasses.tooltip}`]: {
		backgroundColor: theme.palette.error.main,
		color: theme.palette.error.contrastText,
	},
}));

function EditInputCell(props: GridRenderEditCellParams) {
	const { error } = props;

	return (
		<StyledTooltip open={!!error} title={error}>
			<GridEditInputCell {...props} />
		</StyledTooltip>
	);
}

export default EditInputCell;
