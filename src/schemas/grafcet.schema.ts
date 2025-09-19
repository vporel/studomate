import Action from "./action.schema"
import GrafcetComment from "./grafcet-comment.schema"
import Junction from "./junction.schema"
import StepReferral from "./step-referral.schema"
import Step from "./step.schema"
import Transition from "./transition.schema"

export default class Grafcet{
    id: string = ""
    steps: Step[] = []
    transitions: Transition[] = []
    actions: Action[] = []
    stepsReferrals: StepReferral[] = []
    junctions: Junction[] = []
    comments: GrafcetComment[] = []

    /**
     * 
     * @returns The keys are the steps' ids, the values are the ids of the steps and transition(s) necessary to activate the designated step
     */
    getStepsActivationConditions(): Record<string, string[]>{

        return {}
    }

    validate(): string[]|null{

        return null
    }
}