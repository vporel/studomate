import createTrainingModulePages from "../training-pages";
import renderManualLink from "./renderManualLink";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a0", {
	children: renderManualLink,
});

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
