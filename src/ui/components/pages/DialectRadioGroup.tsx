"use client";

import { Dialect } from "@/expression-language/dialect.enum";
import { useT } from "@/ui/i18n/useT";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";

export default function DialectRadioGroup({
	value,
	onChange,
}: {
	value: Dialect;
	onChange: (dialect: Dialect) => void;
}) {
	const t = useT("preferences.defaultDialect");

	return (
		<RadioGroup
			value={value}
			onChange={(e) => onChange(e.target.value as Dialect)}
		>
			{Object.values(Dialect).map((dialect) => (
				<FormControlLabel
					key={dialect}
					value={dialect}
					control={<Radio />}
					label={t(dialect)}
				/>
			))}
		</RadioGroup>
	);
}
