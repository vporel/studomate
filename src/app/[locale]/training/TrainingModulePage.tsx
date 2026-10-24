import PageTitle from "@/ui/components/public-pages/PageTitle";
import { Container, Divider } from "@mui/material";
import type { TrainingModuleId } from "@/training/module-ids";
import { ReactNode } from "react";
import MarkdownBodyServer from "./MarkdownBodyServer";
import ModuleIntro from "./ModuleIntro";
import ModuleIntroProvider from "./ModuleIntroContext";
import ModuleStepper, { StepData } from "./ModuleStepper";
import TrainingPageFooter from "./TrainingPageFooter";

type TrainingModulePageProps = {
	title: string;
	/** Fil d'Ariane rendu au-dessus du titre. */
	breadcrumb?: ReactNode;
	/** Introduction en Markdown (rendue côté serveur). */
	intro: string;
	/** Titre du bloc repliable qui contient l'introduction. */
	introLabel: string;
	steps: StepData[];
	moduleId: TrainingModuleId;
	/** Étape de l'URL ; absente sur la page du module. Sur une page d'étape, le titre du module
	 * n'est qu'un surtitre et l'introduction n'est pas rendue. */
	initialStepId?: string;
	prevLabel: string;
	nextLabel: string;
	nextModule?: React.ComponentProps<typeof ModuleStepper>["nextModule"];
	/** Rendu entre le stepper et le pied de page. */
	children?: ReactNode;
};

export default function TrainingModulePage({
	breadcrumb,
	title,
	intro,
	introLabel,
	steps,
	moduleId,
	initialStepId,
	prevLabel,
	nextLabel,
	nextModule,
	children,
}: TrainingModulePageProps) {
	const isStepPage = initialStepId !== undefined;

	return (
		<Container maxWidth="lg" sx={{ my: 4 }}>
			{breadcrumb}
			<PageTitle as={isStepPage ? "p" : "h1"}>{title}</PageTitle>
			<Divider sx={{ my: 2 }} />
			<ModuleIntroProvider>
				{!isStepPage && (
					<ModuleIntro label={introLabel}>
						<MarkdownBodyServer
							source={intro}
							sx={{
								color: "text.secondary",
								"& p": { textAlign: "justify" },
							}}
						/>
					</ModuleIntro>
				)}

				<ModuleStepper
					steps={steps}
					prevLabel={prevLabel}
					nextLabel={nextLabel}
					moduleId={moduleId}
					initialStepId={initialStepId}
					nextModule={nextModule}
				/>
			</ModuleIntroProvider>

			{children}

			<TrainingPageFooter />
		</Container>
	);
}
