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

			// Smooth the path. This tends to cut off large portions of the path!
			//finalPath.simplify(2);

			// reset
			tool.fixedDistance = 1;

			// Get all Path items
			var items = paper.project.getItems({
			    'class': Path
			});
			for (var i = 0; i < items.length; i++) {
				// Ignore the cursor preview
				if (items[i] === cc) { continue; }
				if (!items[i].intersects(finalPath)) { continue; }
				if (!items[i].getFillColor()) {
					// Ignore overlapping a hole (need more logic for this; shape with hole has multiple fill colors)
				} else if (items[i].getFillColor().equals(finalPath.fillColor)) {
					// Merge same fill color
					var newPath = finalPath.unite(items[i]);
					finalPath.remove();
					items[i].remove();
					finalPath = newPath;
				} else {
					// Erase different color
					var newPath = items[i].subtract(finalPath);
					if (newPath.children) {
					    for (var j = newPath.children.length - 1; j >= 0; j--) {
						    var child = newPath.children[j];
						    child.copyAttributes(newPath);
						    child.fillColor = newPath.fillColor;
						    child.insertAbove(newPath);
					    }
				    	newPath.remove();
					}
				    items[i].remove();
				}
			}
			pg.undo.snapshot('segmentbrush');
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