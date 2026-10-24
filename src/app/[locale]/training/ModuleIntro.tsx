"use client";

import { Box } from "@mui/material";
import { ReactNode, useState } from "react";
import { useModuleIntro } from "./ModuleIntroContext";

/**
 * Introduction of a module, open until a step has been passed then collapsed until opened,
 * and removed once the stepper leaves the first step. Its content is rendered by the server, so it stays in the indexed HTML.
 */
export default function ModuleIntro({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	const intro = useModuleIntro();
	const [chosenOpen, setChosenOpen] = useState<boolean | null>(null);
	if (intro && intro.activeStepIndex > 0) return null;
	const open = chosenOpen ?? (intro?.furthestStepIndex ?? 0) === 0;
	return (
		<Box
			component="details"
			open={open}
			onToggle={(event: React.SyntheticEvent<HTMLDetailsElement>) =>
				setChosenOpen(event.currentTarget.open)
			}
			sx={{ mb: 3 }}
		>
			<Box
				component="summary"
				sx={{
					cursor: "pointer",
					fontWeight: "bold",
					color: "text.secondary",
					mb: 1,
				}}
			>
				{label}
			</Box>
			{children}
		</Box>
	);
}
