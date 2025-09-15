'use client'

import { getStraightPathFromPoints } from "@/lib/svg"
import { ConnectionLineComponentProps } from "@xyflow/react"

const CONNECTION_LINE_Y_OFFSET = 20

export function getConnectionLinePoints(fromX: number, fromY: number, toX: number, toY: number): [number, number][] {
	const points: [number, number][] = []
	if(Math.abs(fromX - toX) < 5 && fromY > toY){
		// Go down by 10 from source
		const downY = fromY + CONNECTION_LINE_Y_OFFSET
		points.push([fromX, fromY])
		points.push([fromX, downY])
		
		// Go left or right depending on cursor position (using fromX as reference)
		const horizontalX = fromX < toX ? fromX - 40 : fromX + 40
		points.push([horizontalX, downY])
		
		// Go up to target level
		points.push([horizontalX, toY-CONNECTION_LINE_Y_OFFSET])
		
		// Go to horizontal center of target
		points.push([toX, toY-CONNECTION_LINE_Y_OFFSET])

		// Finish at final position
		points.push([toX, toY])
	} else {
		// Default behavior for other cases
		points.push([fromX, fromY])
		points.push([toX, toY])
	}

	return points
}

const CustomConnectionLine = ({ fromX, fromY, toX, toY }: ConnectionLineComponentProps) => {

	return <g>
		<path
			fill="none"
			stroke="black"
			strokeWidth={1.5}
			className="animated"
			d={getStraightPathFromPoints(getConnectionLinePoints(fromX, fromY, toX, toY))}
		/>
		<circle
			cx={toX}
			cy={toY}
			fill="#fff"
			r={3}
			stroke="black"
			strokeWidth={1.5}
		/>
	</g>
}

export default CustomConnectionLine