// drawing tool
// adapted from resources on http://paperjs.org

pg.tools.registerTool({
	id: 'pen',
	name: 'Pen'
});

pg.tools.pen = function() {
	var tool;
	
	var options = {
		closePath: 'near start',
		smoothPath : 1
	};
	
	var components = {
		closePath: {
			type: 'list',
			label: 'Close path',
			options: [ 'near start', 'always', 'never' ]
		},
	};

	var activateTool = function() {
		pg.selection.clearSelection();

		var path;
		
		// get options from local storage if present
		options = pg.tools.getLocalOptions(options);
		
		tool = new Tool();
		
		// Make sure a stroke color is set on the pen
		if(!pg.stylebar.getStrokeColor()) {
			pg.stylebar.setStrokeColor(pg.stylebar.getFillColor());
			pg.stylebar.setFillColor(null);
		}

		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			tool.fixedDistance = 2;
			path = new Path();
			path = pg.stylebar.applyActiveToolbarStyle(path);
			path.add(event.point);
		};

		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			path.add(event.point);
			path.smooth(options.smoothPath); // TODO only smooth part that was added for efficiency
		};

		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			//
			// accidental clicks produce a path but no segments
			// so return if an accidental click happened
			if(path.segments.length === 1) path.remove();
			
			if (options.closePath === 'near start' 
				&& pg.math.checkPointsClose(path.segments[0].point, event.point, 30)) {
				path.closePath(true);
			} else if(options.closePath === 'always') {
				path.closePath(true);
			}
			path.simplify(options.smoothPath);
			pg.undo.snapshot('pen');
			
		};
		
		// setup floating tool options panel in the editor
		//pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};


	return {
		options: options,
		activateTool:activateTool
	};

};
