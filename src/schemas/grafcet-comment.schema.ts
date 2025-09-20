import GrafcetElement, { GrafcetElementDimensions, GrafcetElementPosition } from "./grafcet-element.schema"


export default class GrafcetComment extends GrafcetElement{
    id: string = ""
    text: string = ""

    constructor(id: string, text: string, position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        super(position, dimensions)
        this.id = id
        this.text = text
    }
}