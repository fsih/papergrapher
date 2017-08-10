// Applies segment brush functions to the tool
pg.segmentbrushhelper = function(tool, options) {
	var lastPoint, finalPath, firstCircle;

	tool.onSegmentMouseDown = function(event) {
		tool.minDistance = 1;
		tool.maxDistance = options.brushWidth;
		
		firstCircle = new Path.Circle({
		    center: event.point,
		    radius: options.brushWidth/2
		});
		finalPath = firstCircle;
		tool.stylePath(finalPath);
		lastPoint = event.point;
	};
	
	tool.onSegmentMouseDrag = function(event) {
		var step = (event.delta).normalize(options.brushWidth/2);
		var handleVec = step.clone();
		handleVec.length = options.brushWidth/2;
		handleVec.angle += 90;

		var path = new Path();
		path = pg.stylebar.applyActiveToolbarStyle(path);
		path.strokeColor = null;
		// Add handles to round the end caps
		path.add(new Segment(lastPoint - step, -handleVec, handleVec));
		step.angle += 90;

		path.add(event.lastPoint + step);
		path.insert(0, event.lastPoint - step);
		path.add(event.point + step);
		path.insert(0, event.point - step);

		// Add end cap
		step.angle -= 90;
		path.add(new Segment(event.point + step, handleVec, -handleVec));
		path.closed = true;
		// The unite function on curved paths does not always work (sometimes deletes half the path)
		// so we have to flatten.
		path.flatten(Math.min(options.brushWidth/5, 5));
		
		lastPoint = event.point;
		var newPath = finalPath.unite(path);
		path.remove();
		finalPath.remove();
		finalPath = newPath;
	};

	tool.onSegmentMouseUp = function(event) {
		// TODO: This smoothing tends to cut off large portions of the path! Would like to eventually
		// add back smoothing, maybe a custom implementation that only applies to a subset of the line?

		// Smooth the path. Make it unclosed first because smoothing of closed
		// paths tends to cut off the path.
		finalPath.closed = false;
		finalPath.simplify(2);
		finalPath.closed = true;
		var temp = finalPath.unite(firstCircle);
		finalPath.remove();
		finalPath = temp;
		//console.log(finalPath.segments);
		return finalPath;
	};
}