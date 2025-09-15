import GrafcetElement from "./grafcet-element.schema"

export type StepReferralType = "source"|"destination"

export default class StepReferral extends GrafcetElement{
    id: string = ""
    type: StepReferralType = "source"
    stepId: string = ""
}