import GrafcetElement, { GrafcetElementDimensions, GrafcetElementPosition } from "./grafcet-element.schema"

export type StepReferralType = "source"|"destination"

export default class StepReferral extends GrafcetElement{
    id: string = ""
    type: StepReferralType = "source"
    stepId: string = ""

    constructor(id: string, type: StepReferralType, stepId: string, position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        super(position, dimensions)
        this.id = id
        this.type = type
        this.stepId = stepId
    }
}