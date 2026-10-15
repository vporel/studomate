import createTrainingModulePages from "../training-pages";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a2");

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
