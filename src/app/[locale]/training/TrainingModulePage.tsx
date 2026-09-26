import PageTitle from "@/ui/components/public-pages/PageTitle";
import { Container, Divider, Typography } from "@mui/material";
import { ReactNode } from "react";
import ModuleStepper, { StepData } from "./ModuleStepper";
import TrainingPageFooter from "./TrainingPageFooter";

type TrainingModulePageProps = {
	title: string;
	intro: string;
	steps: StepData[];
	moduleId: string;
	prevLabel: string;
	nextLabel: string;
	nextModule?: React.ComponentProps<typeof ModuleStepper>["nextModule"];
	/** Rendu entre le stepper et le pied de page. */
	children?: ReactNode;
};

export default function TrainingModulePage({
	title,
	intro,
	steps,
	moduleId,
	prevLabel,
	nextLabel,
	nextModule,
	children,
}: TrainingModulePageProps) {
	return (
		<Container maxWidth="lg" sx={{ my: 4 }}>
			<PageTitle>{title}</PageTitle>
			<Divider sx={{ my: 2 }} />
			<Typography textAlign="justify" color="text.secondary" mb={4}>
				{intro}
			</Typography>

			<ModuleStepper
				steps={steps}
				prevLabel={prevLabel}
				nextLabel={nextLabel}
				moduleId={moduleId}
				nextModule={nextModule}
			/>

			{children}

			<TrainingPageFooter />
		</Container>
	);
}
