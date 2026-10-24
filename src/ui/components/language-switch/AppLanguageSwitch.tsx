"use client";

import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import LanguageSwitch from "@/ui/components/language-switch/LanguageSwitch";
import { MenuItem } from "@mui/material";

export default function AppLanguageSwitch() {
	const { locale, setLocale } = useLocaleContext();

	return (
		<LanguageSwitch
			current={locale}
			renderItem={(itemLocale, { label, selected, close }) => (
				<MenuItem
					key={itemLocale}
					selected={selected}
					onClick={() => {
						setLocale(itemLocale);
						close();
					}}
				>
					{label}
				</MenuItem>
			)}
		/>
	);
}
