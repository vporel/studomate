"use client";

import { Dialect } from "@/expression-language/dialect.enum";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import CustomModal from "@/ui/components/mui/CustomModal";
import { Box, Button, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import DialectRadioGroup from "../pages/DialectRadioGroup";
import { useProjectStore } from "./ProjectContext";

export default function DefaultDialectModal() {
	const { visible, onChosen } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.defaultDialectModalVisible,
			onChosen: s.ui.onDefaultDialectChosen,
		})),
	);
	const t = useT("preferences.defaultDialect.firstProject");
	const { locale } = useLocaleContext();
	const suggested = locale === "en" ? Dialect.EN : Dialect.FR;
	const [selected, setSelected] = useState<Dialect>(suggested);

	useEffect(() => {
		if (visible) setSelected(suggested);
	}, [visible, suggested]);

	return (
		<CustomModal
			open={visible}
			onClose={() => onChosen?.(null)}
			title={t("title")}
			width={420}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Typography variant="body2" color="text.secondary">
					{t("body")}
				</Typography>
				<DialectRadioGroup value={selected} onChange={setSelected} />
				<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={() => onChosen?.(selected)}>
						{t("confirm")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
