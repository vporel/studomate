import Action from "./action.schema"
import GrafcetComment from "./grafcet-comment.schema"
import GrafcetFluxElement from "./grafcet-flux-element.schema"
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
    /**
     * 
     */
    flux: GrafcetFluxElement[] = []
    comments: GrafcetComment[] = []
}