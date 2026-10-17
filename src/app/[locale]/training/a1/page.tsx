import createTrainingModulePages from "../training-pages";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a1");

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
