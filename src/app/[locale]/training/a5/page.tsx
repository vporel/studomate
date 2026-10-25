import renderGlossaryLink from "../renderGlossaryLink";
import createTrainingModulePages from "../training-pages";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a5", {
	children: renderGlossaryLink,
});

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
