import Variable from "@/schemas/variable/Variable.class";

export type NeededProjectDataWhenValidatingElement = {
	variables: Variable[];
};

export type ElementValidateDataOptions = {
	projectData: NeededProjectDataWhenValidatingElement;
	/**
	 * If false, the validator will perform a partial validation
	 * For instance, when validating a transition,
	 * With false, the validator will perform a lexical validation
	 * With true, a syntactic and semantic validation will be performed (operators, variables mnemonics and types, etc.)
	 * @default false
	 */
	fullValidation?: boolean;
};
