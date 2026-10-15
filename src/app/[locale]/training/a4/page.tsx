import createTrainingModulePages from "../training-pages";

const { generateModuleMetadata, ModulePage } = createTrainingModulePages("a4");

export const generateMetadata = generateModuleMetadata;

export default ModulePage;
