import createTrainingModulePages from "@/app/[locale]/training/training-pages";

const { generateStepMetadata, generateStepStaticParams, StepPage } =
	createTrainingModulePages("a1");

export const dynamicParams = false;

export const generateMetadata = generateStepMetadata;

export const generateStaticParams = generateStepStaticParams;

export default StepPage;
