// Broadbrush based on http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/

// Applies segment brush functions to the tool
pg.broadbrushhelper = function(tool, options) {
	var lastPoint, secondLastPoint, finalPath;

	tool.onBroadMouseDown = function(event) {
		tool.minDistance = 1;
		tool.maxDistance = options.brushWidth;
		if(event.event.button > 0) return;  // only first mouse button
		
		finalPath = new Path();
		tool.stylePath(finalPath);
		finalPath.add(event.point);
		lastPoint = secondLastPoint = event.point;
	};
	
	tool.onBroadMouseDrag = function(event) {
		var step = (event.delta).normalize(options.brushWidth/2);

		// Move the first point out away from the drag so that the end of the path is rounded
		if (finalPath.segments && finalPath.segments.length === 1) {
			var removedPoint = finalPath.removeSegment(0).point;
			// Add handles to round the end caps
			var handleVec = step.clone();
			handleVec.length = options.brushWidth/2;
			handleVec.angle += 90;
			finalPath.add(new Segment(removedPoint - step, -handleVec, handleVec));
		}
		step.angle += 90;
		var top = event.middlePoint + step;
		var bottom = event.middlePoint - step;

		if (finalPath.segments.length > 3) {
			finalPath.removeSegment(finalPath.segments.length - 1);
			finalPath.removeSegment(0);
		}
		finalPath.add(top);
		finalPath.add(event.point + step);
		finalPath.insert(0, bottom);
		finalPath.insert(0, event.point - step);
		if (finalPath.segments.length === 5) {
			// Flatten is necessary to prevent smooth from getting rid of the effect
			// of the handles on the first point.
			finalPath.flatten(Math.min(options.brushWidth/5, 5));
		}
		finalPath.smooth();
		lastPoint = event.point;
		secondLastPoint = event.lastPoint;
	};

	tool.onBroadMouseUp = function(event) {
		// If the mouse up is at the same point as the mouse drag event then we need
		// the second to last point to get the right direction vector for the end cap
		if (event.point.equals(lastPoint)) {
			lastPoint = secondLastPoint;
		}
		// If the points are still equal, then there was no drag, so just draw a circle.
		if (event.point.equals(lastPoint)) {
			finalPath.remove();
			finalPath = new Path.Circle({
			    center: event.point,
			    radius: options.brushWidth/2,
			});
			tool.stylePath(finalPath);
		} else {
			var step = (event.point - lastPoint).normalize(options.brushWidth/2);
			step.angle += 90;
			var handleVec = step.clone();
			handleVec.length = options.brushWidth/2;

			var top = event.point + step;
			var bottom = event.point - step;
			finalPath.add(top);
			finalPath.insert(0, bottom);

			// Simplify before adding end cap so cap doesn't get warped
			finalPath.simplify(1);

			// Add end cap
			step.angle -= 90;
			finalPath.add(new Segment(event.point + step, handleVec, -handleVec));
			finalPath.closed = true;
		}

		// Resolve self-crossings
	    var newPath = 
	    	finalPath
	    		.resolveCrossings()
	    		.reorient(true /* nonZero */, true /* clockwise */)
	    		.reduce({simplify: true});
	    newPath.copyAttributes(finalPath);
	    newPath.fillColor = finalPath.fillColor;
	    finalPath = newPath;
	    return finalPath;
	};
}