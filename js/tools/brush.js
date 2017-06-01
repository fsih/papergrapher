// cool brush from
// http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
// improved with additional options

pg.tools.registerTool({
	id: 'broadbrush',
	name: 'Broad brush'
});

pg.tools.broadbrush = function() {
	var tool;
	var path;
	var cc;

	var options = {
		brushWidth: 60
	};
	
	var components = {
		brushWidth: {
			type: 'float',
			label: 'Brush width',
			min: 0
		}
	};
	
	var activateTool = function() {
		// get options from local storage if present
		options = pg.tools.getLocalOptions(options);
		tool = new Tool();
		var lastPoint, secondLastPoint;
		
		cc = new Path.Circle({
			    center: [-10000, -10000],
			    radius: options.brushWidth/2,
			    fillColor: pg.stylebar.getFillColor()
			});
		
		tool.fixedDistance = 1;
		tool.onMouseDown = function(event) {
			tool.minDistance = options.brushWidth/4;
			tool.maxDistance = options.brushWidth;
			if(event.event.button > 0) return;  // only first mouse button
			
			path = new Path();
			path = pg.stylebar.applyActiveToolbarStyle(path);
			path.add(event.point);
			lastPoint = secondLastPoint = event.point;
		};
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;

			var step = (event.delta).normalize(options.brushWidth/2);

			// Move the first point out away from the drag so that the end of the path is rounded
			if (path.segments.length === 1) {
				var removedPoint = path.removeSegment(0).point;
				// Add handles to round the end caps
				var handleVec = step.clone();
				handleVec.length = options.brushWidth/2;
				handleVec.angle += 90;
				path.add(new Segment(removedPoint - step, -handleVec, handleVec));
			}
			step.angle += 90;
			var top = event.middlePoint + step;
			var bottom = event.middlePoint - step;

			if (path.segments.length > 3) {
				path.removeSegment(path.segments.length - 1);
				path.removeSegment(0);
			}
			//path.selected = true;
			path.add(top);
			path.add(event.point + step);
			path.insert(0, bottom);
			path.insert(0, event.point - step);
			if (path.segments.length === 5) {
				// Flatten is necessary to prevent smooth from getting rid of the effect
				// of the handles on the first point.
				path.flatten(options.brushWidth/5);
			}
			path.smooth();
			lastPoint = event.point;
			secondLastPoint = event.lastPoint;

			cc.position = event.point;
		};

		tool.onMouseMove = function(event) {
			cc.remove();
			cc = new Path.Circle({
			    center: event.point,
			    radius: options.brushWidth/2,
			    fillColor: pg.stylebar.getFillColor()
			});
		};

		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			// If the mouse up is at the same point as the mouse drag event then we need
			// the second to last point to get the right direction vector for the end cap
			if (event.point.equals(lastPoint)) {
				lastPoint = secondLastPoint;
			}
			// If the points are still equal, then there was no drag, so just draw a circle.
			if (event.point.equals(lastPoint)) {
				path = new Path.Circle({
				    center: event.point,
				    radius: options.brushWidth/2,
				    fillColor: pg.stylebar.getFillColor()
				});
			} else {
				var step = (event.point - lastPoint).normalize(options.brushWidth/2);
				step.angle += 90;
				var handleVec = step.clone();
				handleVec.length = options.brushWidth/2;

				var top = event.point + step;
				var bottom = event.point - step;
				path.add(top);
				path.insert(0, bottom);

				// Simplify before adding end cap so cap doesn't get warped
				path.simplify(1);

				// Add end cap
				step.angle -= 90;
				path.add(new Segment(event.point + step, handleVec, -handleVec));
				path.closed = true;
			}
			
			// reset
			tool.fixedDistance = 1;

			pg.undo.snapshot('broadbrush');
		};
		
		// setup floating tool options panel in the editor
		pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};

	var deactivateTool = function() {
		cc.remove();
	}
	
	return {
		options: options,
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};