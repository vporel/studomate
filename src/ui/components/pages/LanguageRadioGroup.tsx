"use client";

import { LOCALES, type Locale } from "@/i18n/config";
import { useT } from "@/ui/i18n/useT";
import { FormControlLabel, Radio, RadioGroup } from "@mui/material";

export default function LanguageRadioGroup({
	value,
	onChange,
}: {
	value: Locale;
	onChange: (locale: Locale) => void;
}) {
	const t = useT("common.language");

	return (
		<RadioGroup
			value={value}
			onChange={(e) => onChange(e.target.value as Locale)}
		>
			{LOCALES.map((locale) => (
				<FormControlLabel
					key={locale}
					value={locale}
					control={<Radio />}
					label={t(locale)}
				/>
			))}
		</RadioGroup>
	);
}
