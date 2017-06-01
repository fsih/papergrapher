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

	var options = {
		minDistance: 10,
		maxDistance: 45,
		brushWidth: 60,
		strokeEnds: 6,
		endLength: 7,
		endVariation: 2,
		endType: 'slime'
	};
	
	var components = {
		minDistance: {
			type: 'int',
			label: 'Min distance',
			min: 10
		},
		maxDistance: {
			type: 'int',
			label: 'Max distance',
			min: 45
		},
		brushWidth: {
			type: 'float',
			label: 'Brush width',
			min: 0
		},
		strokeEnds: {
			type: 'int',
			label: 'Stroke ends',
			min: 0
		},
		endLength: {
			type: 'float',
			label: 'Ends length',
			min: 0
		},
		endVariation: {
			type: 'float',
			label: 'Ends variation',
			min: 0
		},
		endType: {
			type: 'list',
			label: 'Ends',
			options: [ 'linear', 'smooth', 'slime' ]
		}
	};
	
	
	var activateTool = function() {
		
		// get options from local storage if present
		options = pg.tools.getLocalOptions(options);
		tool = new Tool();
		var lastPoint;

		tool.fixedDistance = 1;
		tool.onMouseDown = function(event) {
			tool.minDistance = options.minDistance;
			tool.maxDistance = options.maxDistance;
			if(event.event.button > 0) return;  // only first mouse button
			
			path = new Path();
			path = pg.stylebar.applyActiveToolbarStyle(path);
			path.add(event.point);
			lastPoint = event.point;
		};
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;

			var step = (event.delta).normalize(options.brushWidth/2);

			if (path.segments.length === 1) {
				var removedPoint = path.removeSegment(0).point;
				debugger;
				path.add(removedPoint - step);
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
			path.smooth();
			lastPoint = event.point;

			cc.position = event.point;
		};

		var cc = new Path.Circle({
		    center: [-1000, -1000],
		    radius: options.brushWidth/2,
		    fillColor: pg.stylebar.getFillColor()
		});
		tool.onMouseMove = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;
			console.log('move')
		};

		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			var step = (event.point - lastPoint).normalize(options.brushWidth/2);
			step.angle += 90;
			var top = event.point + step;
			var bottom = event.point - step;
			path.add(top);
			path.insert(0, bottom);
			step.angle -= 90;
			path.add(event.point + step);
			path.closed = true;
			path.smooth();
			path.simplify(1.5);
			
			// resettin
			strokeIndices = [];
			
			tool.fixedDistance = 1;
			pg.undo.snapshot('broadbrush');
			console.log('up')

		};
		
		// setup floating tool options panel in the editor
		pg.toolOptionPanel.setup(options, components, function() {
			tool.minDistance = options.minDistance;
			tool.maxDistance = options.maxDistance;
		});
		
		tool.activate();
	};
	
	return {
		options: options,
		activateTool : activateTool
	};
	
};