// cool brush from
// http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
// improved with additional options

pg.tools.registerTool({
	id: 'segmentbrush',
	name: 'Segment brush'
});

pg.tools.segmentbrush = function() {
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
		var lastPoint, finalPath;

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
			
			finalPath = new Path.Circle({
			    center: event.point,
			    radius: options.brushWidth/2,
			    fillColor: pg.stylebar.getFillColor()
			});
			lastPoint = event.point;
		};
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;

			var step = (event.delta).normalize(options.brushWidth/2);
			var handleVec = step.clone();
			handleVec.length = options.brushWidth/2;
			handleVec.angle += 90;

			path = new Path();
			path = pg.stylebar.applyActiveToolbarStyle(path);
			// Add handles to round the end caps
			path.add(new Segment(lastPoint - step, -handleVec, handleVec));
			step.angle += 90;

			path.selected = true;
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
			path.flatten(3);
			
			lastPoint = event.point;
			var newPath = finalPath.unite(path);
			path.remove();
			finalPath.remove();
			finalPath = newPath;
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

			finalPath.simplify(2);

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