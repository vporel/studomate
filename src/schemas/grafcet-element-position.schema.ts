
export type GrafcetElementType = "step"|"transition"|"action"|"source-arrow"|"destination-arrow"|
    "or-junction-start"|"or-junction-end"|"and-junction-start"|"and-junction-end"

export default class GrafcetElement{
    elementType: GrafcetElementType = "step"
    elementId: string = ""
}