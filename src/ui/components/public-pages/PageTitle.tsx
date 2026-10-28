import { Typography } from "@mui/material";
import { ReactNode } from "react";

export default function PageTitle({
	children,
	as = "h1",
}: {
	children: ReactNode;
	/** `"p"` keeps the title's look without exposing it as a heading. */
	as?: "h1" | "p";
}) {
	return (
		<Typography variant="h2" component={as} color="primary" gutterBottom>
			{children}
		</Typography>
	);
}
