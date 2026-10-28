import renderGlossaryLink from "@/app/[locale]/training/renderGlossaryLink";
import createTrainingModulePages from "@/app/[locale]/training/training-pages";

const { generateStepMetadata, generateStepStaticParams, StepPage } =
	createTrainingModulePages("a2", { children: renderGlossaryLink });

export const dynamicParams = false;

export const generateMetadata = generateStepMetadata;

export const generateStaticParams = generateStepStaticParams;

export default StepPage;
