
export type GrafcetElementType = "step"|"transition"|"action"|"step-referral"|"junction"

export type GrafcetElementPosition = {x: number, y: number}
export type GrafcetElementDimensions = {width: number, height: number}

export default class GrafcetElement{
    position: GrafcetElementPosition = {x: 0, y: 0}
    dimensions: GrafcetElementDimensions = {width: 0, height: 0}

    constructor(position: GrafcetElementPosition, dimensions: GrafcetElementDimensions){
        this.position = position
        this.dimensions = dimensions
    }
}