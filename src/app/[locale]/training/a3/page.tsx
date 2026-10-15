import createTrainingModulePages from "../training-pages";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a3");

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
