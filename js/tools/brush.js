// cool brush from
// http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/
// improved with additional options

pg.tools.registerTool({
	id: 'broadbrush',
	name: 'Brush'
});

pg.tools.broadbrush = function() {
	var tool;
	var finalPath;
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
		var lastPoint, secondLastPoint, brush;
		var BROAD = "broadbrush";
		var SEGMENT = "segmentbrush";
		// brush size >= threshold use segment brush, else use broadbrush
		// Segment brush has performance issues at low threshold, but broad brush has weird corners
		// which are more obvious the bigger it is
		var THRESHOLD = 20;
		
		cc = new Path.Circle({
			    center: [-10000, -10000],
			    radius: options.brushWidth/2,
			    fillColor: pg.stylebar.getFillColor()
			});
		
		tool.fixedDistance = 1;


		tool.onMouseMove = function(event) {
			cc.remove();
			cc = new Path.Circle({
			    center: event.point,
			    radius: options.brushWidth/2,
			    fillColor: pg.stylebar.getFillColor()
			});
		};
		
		tool.onMouseDown = function(event) {
			if (options.brushWidth < THRESHOLD) {
				brush = BROAD;
				this.onBroadMouseDown(event);				
			} else {
				brush = SEGMENT;
				this.onSegmentMouseDown(event);
			}
		};

		tool.onMouseDrag = function(event) {
			if (brush === BROAD) {
				this.onBroadMouseDrag(event);
			} else if (brush === SEGMENT) {
				this.onSegmentMouseDrag(event);
			} else {
				console.warn("Brush type does not exist: ", brush);
			}
		};

		tool.onMouseUp = function(event) {
			if (brush === BROAD) {
				this.onBroadMouseUp(event);
			} else if (brush === SEGMENT) {
				this.onSegmentMouseUp(event);
			} else {
				console.warn("Brush type does not exist: ", brush);
			}

			tool.smartMerge();

			// Reset
			brush = undefined;
			tool.fixedDistance = 1;
		};

		tool.smartMerge = function() {
			debugger;
			// Get all Path items
			var items = paper.project.getItems({
			    'class': Path
			});
			// Move down z order to first overlapping item
			for (var i = 0; i < items.length && !items[i].intersects(finalPath); i++) { continue; }
			for (; i < items.length; i++) {
				// Ignore the cursor preview and non-intersecting
				if (items[i] === cc || items[i] === finalPath || !items[i].intersects(finalPath)) { continue; }
				if (!items[i].getFillColor()) {
					// Ignore overlapping a hole (need more logic for this; shape with hole has multiple fill colors)
				} else if (items[i].getFillColor().equals(finalPath.fillColor)) {
					// Merge same fill color
					var newPath = finalPath.unite(items[i]);
					finalPath.remove();
					items[i].remove();
					finalPath = newPath;
				} else {
					break; // stop when you reach a different color. Doesn't touch paths with z index lower than last non-matching color
					// // Erase different color
					// var newPath = items[i].subtract(finalPath);
					// if (newPath.children) {
					//     for (var j = newPath.children.length - 1; j >= 0; j--) {
					// 	    var child = newPath.children[j];
					// 	    child.copyAttributes(newPath);
					// 	    child.fillColor = newPath.fillColor;
					// 	    child.insertAbove(newPath);
					//     }
				 //    	newPath.remove();
					// }
				 //    items[i].remove();
				}
			}
			pg.undo.snapshot('broadbrush');
		}

		// broad brush =======================================================================
		tool.onBroadMouseDown = function(event) {
			tool.minDistance = options.brushWidth/4;
			tool.maxDistance = options.brushWidth;
			if(event.event.button > 0) return;  // only first mouse button
			
			finalPath = new Path();
			finalPath = pg.stylebar.applyActiveToolbarStyle(finalPath);
			finalPath.add(event.point);
			lastPoint = secondLastPoint = event.point;
		};
		
		tool.onBroadMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;

			var step = (event.delta).normalize(options.brushWidth/2);

			// Move the first point out away from the drag so that the end of the path is rounded
			if (finalPath.segments.length === 1) {
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
			//path.selected = true;
			finalPath.add(top);
			finalPath.add(event.point + step);
			finalPath.insert(0, bottom);
			finalPath.insert(0, event.point - step);
			if (finalPath.segments.length === 5) {
				// Flatten is necessary to prevent smooth from getting rid of the effect
				// of the handles on the first point.
				finalPath.flatten(options.brushWidth/5);
			}
			finalPath.smooth();
			lastPoint = event.point;
			secondLastPoint = event.lastPoint;

			cc.position = event.point;
		};

		tool.onBroadMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
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
				    fillColor: pg.stylebar.getFillColor()
				});
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
			finalPath.resolveCrossings().reorient(true /* nonZero */, true /* clockwise */);

			pg.undo.snapshot('broadbrush');
		};

		// Segment brush ================================================
		tool.onSegmentMouseDown = function(event) {
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
		
		tool.onSegmentMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			cc.position = event.point;

			var step = (event.delta).normalize(options.brushWidth/2);
			var handleVec = step.clone();
			handleVec.length = options.brushWidth/2;
			handleVec.angle += 90;

			var path = new Path();
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

		tool.onSegmentMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			// TODO: This smoothing tends to cut off large portions of the path! Would like to eventually
			// add back smoothing, maybe a custom implementation?

			// Smooth the path.
			//finalPath.simplify(2);

			pg.undo.snapshot('broadbrush');
		};
		
		// setup floating tool options panel in the editor
		pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};
	//=========================================================

	var deactivateTool = function() {
		cc.remove();
	};
	
	return {
		options: options,
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};