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
		var hitPoint = null;
		var hitPath = null;

		var hitOptions = {
			ends: true,
			guide: false,
			tolerance: 6
		};
		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			// If you click near a point, continue that line instead of making a new line
			hitPath = null;
			if (path) {
				path.setSelected(false);
				path = null;
			}
			var hitResult = paper.project.hitTest(event.point, hitOptions);
			if (hitResult && hitResult.item && !hitResult.item.closed) {
				hitPath = hitResult.item;
			}

			if (hitPath) {
				var result = tool.findHandle(hitPath, event.point);
				if (result) {
					if (result.segment.index === 0) {
						hitPath.firstSegment.setSelected(true);
						hitPath.reverse();
					} else if (result.segment.index === hitPath.segments.length - 1) {
						hitPath.lastSegment.setSelected(true);
					}
					path = hitPath;
					path.add(result.segment); // Add second point, which is what will move when dragged
				}
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
			hitPoint = null;
			if (hitPath) {
				hitPath.setSelected(false);
				hitPath = null;
			}

			if (path && path.firstSegment.point.getDistance(event.point, true) < tool.tolerance() * tool.tolerance()) {
				hitPoint = path.firstSegment;
			} else {
				var hitResult = paper.project.hitTest(event.point, hitOptions);
				if (hitResult && hitResult.item && hitResult.item !== path && !hitResult.item.closed) {
					hitPath = hitResult.item;
					console.log(hitResult);
				}
				if (hitPath) {
					hitPath.setSelected(true);
					var result = tool.findHandle(hitPath, event.point);
					if (result) {
						if (result.segment.index === hitPath.segments.length - 1) {
							hitPath.reverse();
						}
						hitPath.firstSegment.setSelected(true);
						hitPoint = result.segment;
					}
				}
			}
		}
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			// If near another path's endpoint, or this path's beginpoint, clip to it to suggest
			// joining/closing the paths.
			if (hitPath && hitPath !== path) hitPath.setSelected(false);
			hitPoint = null;
			hitPath = null;

			if (path && path.segments.length > 3 && path.firstSegment.point.getDistance(event.point) < tool.tolerance()) {
				hitPoint = path.firstSegment;
			} else {
				var hitResult = paper.project.hitTest(event.point, hitOptions);
				if (hitResult && hitResult.item && hitResult.item !== path && !hitResult.item.closed) {
					hitPath = hitResult.item;
				}
				if (hitPath) {
					hitPath.setSelected(true);
					var result = tool.findHandle(hitPath, event.point);
					if (result) {
						if (result.segment.index === hitPath.segments.length - 1) {
							hitPath.reverse();
						}
						hitPath.firstSegment.setSelected(true);
						hitPoint = result.segment;
					}
				}
			}

			if (hitPoint) {
				//console.log(hitPoint);
			}

			if (path) {
				if (hitPoint) {
					path.lastSegment.point = hitPoint.point;
				} else {
					path.lastSegment.point = event.point;
				}
			}
		};
		
		
		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			// If I single clicked, don't do anything
			if (path.segments.length < 2 || path.segments.length === 2 && path.firstSegment.point.getDistance(path.lastSegment.point) < tool.tolerance()) {
				path.remove();
				path = null;
				return;
			}
			else if (path.lastSegment.point.equals(path.segments[path.segments.length - 2].point)) {
				path.removeSegment(path.segments.length - 1);
				return;
			}
			
			// If I intersect other line end points, join or close
			if (hitPoint) {
				if (path.firstSegment === hitPoint) {
					path.removeSegment(path.segments.length - 1);
					path.closed = true;
					path.setSelected(false);
				} else {
					// joining two paths
					path.removeSegment(path.segments.length - 1);
					path.join(hitPath);
				}
				hitPoint = null;
			}

			// Reset
			if (path) {
				pg.undo.snapshot('line');
			}
			
		};
	
		tool.findHandle = function(path, point) {
			for (var i = 0, l = path.segments.length; i < l; i += l-1) {
				var segment = path.segments[i];
				var distance = (point - segment.point).length;
				if (distance < hitOptions.tolerance) {
					return {
						segment: segment
					};
				}
			}
			return null;
		};

		tool.tolerance = function() {
			return hitOptions.tolerance / paper.view.zoom;
		}
		
		tool.activate();
	};
	
	return {
		options: options,
		activateTool : activateTool
	};
	
};