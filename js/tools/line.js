// bezier tool
// adapted from the paperjs examples (Tools/BezierTool.html)

pg.tools.registerTool({
	id: 'line',
	name: 'Line',
	usedKeys : {
		toolbar : 'l'
	}
});

pg.tools.line = function() {
	var tool;
	var options = {};
	
	var activateTool = function() {
		tool = new Tool();
		
		var path;
		var hitResult = null;
		var tolerance = 6;

		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			if (path) {
				path.setSelected(false);
				path = null;
			}

			// If you click near a point, continue that line instead of making a new line
			hitResult = tool.findLineEnd(event.point);
			if (hitResult) {
				path = hitResult.path;
				if (hitResult.isFirst) {
					path.reverse();
				}
				path.lastSegment.setSelected(true);
				path.add(hitResult.segment); // Add second point, which is what will move when dragged
			}

			// If not near other path, start a new path
			if (!path) {
				path = new Path();
				path = pg.stylebar.applyActiveToolbarStyle(path);
				path.setSelected(true);
				path.add(event.point);
				path.add(event.point); // Add second point, which is what will move when dragged
			}
		};

		tool.onMouseMove = function(event) {
			// If near another path's endpoint, or this path's beginpoint, clip to it to suggest
			// joining/closing the paths.
			if (hitResult) {
				hitResult.path.setSelected(false);
				hitResult = null;
			}

			if (path && path.firstSegment.point.getDistance(event.point, true) < tool.tolerance() * tool.tolerance()) {
				hitResult = {
					path: path,
					segment: path.firstSegment,
					isFirst: true
				};
			} else {
				hitResult = tool.findLineEnd(event.point);
			}

			if (hitResult) {
				var hitPath = hitResult.path;
				hitPath.setSelected(true);
				if (hitResult.isFirst) {
					hitPath.firstSegment.setSelected(true);
				} else {
					hitPath.lastSegment.setSelected(true);
				}
			}
		};
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			// If near another path's endpoint, or this path's beginpoint, clip to it to suggest
			// joining/closing the paths.
			if (hitResult && hitResult.path !== path) hitResult.path.setSelected(false);
			hitResult = null;

			if (path && path.segments.length > 3 && path.firstSegment.point.getDistance(event.point, true) < tool.tolerance() * tool.tolerance()) {
				hitResult = {
					path: path,
					segment: path.firstSegment,
					isFirst: true
				};
			} else {
				hitResult = tool.findLineEnd(event.point, path);
				if (hitResult) {
					var hitPath = hitResult.path;
					hitPath.setSelected(true);
					if (hitResult.isFirst) {
						hitPath.firstSegment.setSelected(true);
					} else {
						hitPath.lastSegment.setSelected(true);
					}
				}
			}

			// snapping
			if (path) {
				if (hitResult) {
					path.lastSegment.point = hitResult.segment.point;
				} else {
					path.lastSegment.point = event.point;
				}
			}
		};
		
		
		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			// If I single clicked, don't do anything
			if (path.segments.length < 2 || path.segments.length === 2 && path.firstSegment.point.getDistance(event.point, true) < tool.tolerance() * tool.tolerance()) {
				path.remove();
				path = null;
				return;
			} else if (path.lastSegment.point.getDistance(path.segments[path.segments.length - 2].point, true) < tool.tolerance() * tool.tolerance()) {
				path.removeSegment(path.segments.length - 1);
				return;
			}
			
			// If I intersect other line end points, join or close
			if (hitResult) {
				path.removeSegment(path.segments.length - 1);
				if (path.firstSegment === hitResult.segment) {
					// close path
					path.closed = true;
					path.setSelected(false);
				} else {
					// joining two paths
					if (!hitResult.isFirst) {
						hitResult.path.reverse();
					}
					path.join(hitResult.path);
				}
				hitResult = null;
			}

			if (path) {
				pg.undo.snapshot('line');
			}
			
		};
	
		tool.findLineEnd = function(point, excludePath) {
			var lines = paper.project.getItems({
			    'class': Path
			});	
			// Slightly prefer more recent lines
			for (var i = lines.length - 1; i >= 0; i--) {
				if (lines[i].closed) {
					continue;
				}
				if (excludePath && lines[i] === excludePath) {
					continue;
				}
				if (lines[i].firstSegment && lines[i].firstSegment.point.getDistance(point, true) < tool.tolerance() * tool.tolerance()) {
					return {
						path: lines[i],
						segment: lines[i].firstSegment,
						isFirst: true
					};
				}
				if (lines[i].lastSegment && lines[i].lastSegment.point.getDistance(point, true) < tool.tolerance() * tool.tolerance()) {
					return {
						path: lines[i],
						segment: lines[i].lastSegment,
						isFirst: false
					};
				}
			}
			return null;
		};

		tool.tolerance = function() {
			return tolerance / paper.view.zoom;
		};
		
		tool.activate();
	};
	
	return {
		options: options,
		activateTool : activateTool
	};
	
};