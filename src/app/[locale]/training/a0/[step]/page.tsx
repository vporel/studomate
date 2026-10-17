import createTrainingModulePages from "@/app/[locale]/training/training-pages";
import renderManualLink from "../renderManualLink";

const { generateStepMetadata, generateStepStaticParams, StepPage } =
	createTrainingModulePages("a0", { children: renderManualLink });

export const dynamicParams = false;

export const generateMetadata = generateStepMetadata;

export const generateStaticParams = generateStepStaticParams;

export default StepPage;
