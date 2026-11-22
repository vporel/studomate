"use client";

import { CONVERTIBLE_TYPES } from "@/expression-language/conversions";
import {
	ConvertBlockParams,
	getConvertBlockOutTypes,
	withConvertBlockInType,
} from "@/schemas/ladder/block.schema";
import { useT } from "@/ui/i18n/useT";
import { Box, Typography } from "@mui/material";
import OperatorSelect from "./OperatorSelect";

/**
 * Source and target types of a `"convert"` block (`INT TO REAL`), centred under its label. The
 * target options only list the conversions supported from the chosen source type.
 */
export default function ConvertTypeSelects({
	params,
	onChange,
	disabled = false,
}: {
	params: ConvertBlockParams;
	onChange: (params: ConvertBlockParams) => void;
	disabled?: boolean;
}) {
	const t = useT("ladderEditor.block");
	return (
		<Box
			sx={{
				position: "absolute",
				left: "50%",
				transform: "translateX(-50%)",
				top: "12px",
				display: "flex",
				alignItems: "center",
				gap: "3px",
			}}
		>
			<OperatorSelect
				value={params.inType}
				onChange={(inType) => onChange(withConvertBlockInType(params, inType))}
				operators={CONVERTIBLE_TYPES}
				ariaLabel={t("convertInTypeAria")}
				disabled={disabled}
				fontSize={9}
				menuFontSize={11}
			/>
			<Typography sx={{ fontSize: 9 }}>TO</Typography>
			<OperatorSelect
				value={params.outType}
				onChange={(outType) => onChange({ ...params, outType })}
				operators={getConvertBlockOutTypes(params.inType)}
				ariaLabel={t("convertOutTypeAria")}
				disabled={disabled}
				fontSize={9}
				menuFontSize={11}
			/>
		</Box>
	);
}
