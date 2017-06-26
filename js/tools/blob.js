// Broadbrush based on http://paperjs.org/tutorials/interaction/working-with-mouse-vectors/

pg.blob = function() {
	var tool;
	var options;
	var finalPath;
	var cursorPreview;
	var lastPoint, secondLastPoint, brush;
	var BROAD = "broadbrush";
	var SEGMENT = "segmentbrush";
	var isEraser;
	
	var activateTool = function(isEraser, tool, options) {
		this.tool = tool;
		this.options = options;
		// brush size >= threshold use segment brush, else use broadbrush
		// Segment brush has performance issues at low threshold, but broad brush has weird corners
		// which are more obvious the bigger it is
		var THRESHOLD = 20;
		
		cursorPreview = new Path.Circle({
			    center: [-10000, -10000],
			    radius: options.brushWidth/2,
			});

		tool.stylePath = function(path) {
			if (isEraser) {
				path.fillColor = 'white';
			} else {
				// TODO keep a separate active toolbar style for brush vs pen?
				path = pg.stylebar.applyActiveToolbarStyle(path);
			}
		};

		tool.stylePath(cursorPreview);
		if (isEraser) {
			cursorPreview.strokeColor = 'cornflowerblue';
			cursorPreview.strokeWidth = 1;
		}
		tool.fixedDistance = 1;

		tool.onMouseMove = function(event) {
			if (options.brushWidth/2 !== cursorPreview.radius) {
				cursorPreview.radius = options.brushWidth/2;
			}
			cursorPreview.bringToFront();
			cursorPreview.position = event.point;
		};
		
		tool.onMouseDown = function(event) {
			if (options.brushWidth < THRESHOLD) {
				brush = BROAD;
				this.onBroadMouseDown(event);				
			} else {
				brush = SEGMENT;
				this.onSegmentMouseDown(event);
			}
			cursorPreview.bringToFront();
			cursorPreview.position = event.point;
		};

		tool.onMouseDrag = function(event) {
			if (brush === BROAD) {
				this.onBroadMouseDrag(event);
			} else if (brush === SEGMENT) {
				this.onSegmentMouseDrag(event);
			} else {
				console.warn("Brush type does not exist: ", brush);
			}
			cursorPreview.bringToFront();
			cursorPreview.position = event.point;
		};

		tool.onMouseUp = function(event) {
			if (brush === BROAD) {
				this.onBroadMouseUp(event);
			} else if (brush === SEGMENT) {
				this.onSegmentMouseUp(event);
			} else {
				console.warn("Brush type does not exist: ", brush);
			}

			if (!isEraser) {
				tool.mergeBrush();
			} else {
				tool.mergeEraser();
			}
			cursorPreview.bringToFront();
			cursorPreview.position = event.point;

			// Reset
			brush = undefined;
			tool.fixedDistance = 1;
		};

		tool.mergeBrush = function() {
			// Get all path items to merge with
			var paths = paper.project.getItems({
			    'match': function(item) {
			    	return tool.isMergeable(finalPath, item);
			    }
			});

			var mergedPath = finalPath;
			// Move down z order to first overlapping item
			for (var i = paths.length - 1; i >= 0 && !tool.touches(paths[i], finalPath); i--) {
				continue;
			}
			var mergedPathIndex = i;
			for (; i >= 0; i--) {
				if (!tool.touches(paths[i], finalPath)) {
					continue;
				}
				if (!paths[i].getFillColor()) {
					console.warn('No fill color: ');
					console.warn(paths[i]);
				} else if (tool.colorMatch(paths[i], finalPath)) {
					// Make sure the new shape isn't overlapped by anything that would visibly change if we change its z order
					for (var j = mergedPathIndex; j > i; j--) {
						if (tool.touches(paths[j], paths[i])) {
							continue;
						}
					}
					// Merge same fill color
					var tempPath = mergedPath.unite(paths[i]);
					tempPath.strokeColor = paths[i].strokeColor;
					tempPath.strokeWidth = paths[i].strokeWidth;
					if (mergedPath === finalPath) {
						tempPath.insertAbove(paths[i]); // First intersected path determines z position of the new path
					} else {
						tempPath.insertAbove(mergedPath); // Rest of merges join z index of merged path
						mergedPathIndex--; // Removed an item, so the merged path index decreases
					}
					mergedPath.remove();
					mergedPath = tempPath;
					paths[i].remove();
					paths.splice(i, 1);
				}
			}
			pg.undo.snapshot('broadbrush');
		};

		tool.mergeEraser = function() {
			// Get all path items to merge with
			// If there are selected items, try to erase from amongst those.
			var items = paper.project.getItems({
			    'match': function(item) {
			    	return item.selected && tool.isMergeable(finalPath, item) && tool.touches(finalPath, item);
			    }
			});
			// Eraser didn't hit anything selected, so assume they meant to erase from all instead of from subset and deselect
			// the selection
			debugger;
			if (items.length === 0) {
				pg.selection.clearSelection();
				items = paper.project.getItems({
				    'match': function(item) {
				    	return tool.isMergeable(finalPath, item) && tool.touches(finalPath, item);
				    }
				});
			}
			for (var i = items.length - 1; i >= 0; i--) {
				// Assume that result of erase operation returns clockwise paths for positive shapes
				var clockwiseChildren = [];
				var ccwChildren = [];
				var newPath = items[i].subtract(finalPath);
				if (newPath.children) {
				    for (var j = newPath.children.length - 1; j >= 0; j--) {
					    var child = newPath.children[j];
					    if (child.isClockwise()) {
					    	clockwiseChildren.push(child);
					    } else {
					    	ccwChildren.push(child);
					    }
					}
				    for (j = 0; j < clockwiseChildren.length; j++) {
					    var cw = clockwiseChildren[j];
					    cw.copyAttributes(newPath);
					    cw.fillColor = newPath.fillColor;
						cw.strokeColor = newPath.strokeColor;
						cw.strokeWidth = newPath.strokeWidth;
					    cw.insertAbove(items[i]);
					    
					    // Go backward since we are deleting elements
					    var newCw = cw;
					    for (var k = ccwChildren.length - 1; k >= 0; k--) {
					    	var ccw = ccwChildren[k];
					    	if (tool.enclosesOrExcloses(ccw, cw)) {
					    		var temp = newCw.subtract(ccw);
					    		newCw.remove();
					    		newCw = temp;
					    		ccw.remove();
					    		ccwChildren.splice(k, 1);
					    	}
					    }
				    }
			    	newPath.remove();
				}
			    items[i].remove();
			}
			finalPath.remove();
			pg.undo.snapshot('eraser');
		};

		tool.colorMatch = function(existingPath, addedPath) {
			// TODO is it possible to have transparent fill colors detect as touching?
			return existingPath.getFillColor().equals(addedPath.getFillColor()) 
			        && (addedPath.getStrokeColor() === null || addedPath.getStrokeColor().equals(existingPath.getStrokeColor()))
			        && tool.touches(existingPath, addedPath);
		};

		tool.touches = function(path1, path2) {
			// Two shapes are touching if their paths intersect
			if (path1 && path2 && path1.intersects(path2)) {
				return true;
			}
			return tool.firstEnclosesSecond(path1, path2) || tool.firstEnclosesSecond(path2, path1);
		};

		tool.firstEnclosesSecond = function(path1, path2) {
			// Two shapes are also touching if one is completely inside the other
			if (path1 && path2 && path2.firstSegment && path2.firstSegment.point 
				    && path1.hitTest(path2.firstSegment.point)) {
				return true;
			}
			// TODO clean up these no point paths
			return false;
		};

		tool.isMergeable = function(newPath, existingPath) {
			return existingPath instanceof PathItem // path or compound path 
				&& existingPath !== cursorPreview  // don't merge with the mouse preview
				&& existingPath !== newPath // don't merge with self
				&& existingPath.parent instanceof Layer; // don't merge with nested in group
		};

		// broad brush =======================================================================
		tool.onBroadMouseDown = function(event) {
			tool.minDistance = options.brushWidth/4;
			tool.maxDistance = options.brushWidth;
			if(event.event.button > 0) return;  // only first mouse button
			
			finalPath = new Path();
			tool.stylePath(finalPath);
			finalPath.add(event.point);
			lastPoint = secondLastPoint = event.point;
		};
		
		tool.onBroadMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

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
				finalPath.flatten(options.brushWidth/5);
			}
			finalPath.smooth();
			lastPoint = event.point;
			secondLastPoint = event.lastPoint;
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
		};

		// Segment brush ================================================
		tool.onSegmentMouseDown = function(event) {
			tool.minDistance = options.brushWidth/4;
			tool.maxDistance = options.brushWidth;
			if(event.event.button > 0) return;  // only first mouse button
			
			finalPath = new Path.Circle({
			    center: event.point,
			    radius: options.brushWidth/2
			});
			tool.stylePath(finalPath);
			lastPoint = event.point;
		};
		
		tool.onSegmentMouseDrag = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

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
			path.flatten(3);
			
			lastPoint = event.point;
			var newPath = finalPath.unite(path);
			path.remove();
			finalPath.remove();
			finalPath = newPath;
		};

		tool.onSegmentMouseUp = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

			// TODO: This smoothing tends to cut off large portions of the path! Would like to eventually
			// add back smoothing, maybe a custom implementation that only applies to a subset of the line?

			// Smooth the path.
			//finalPath.simplify(2);
			//console.log(finalPath.segments);
		};
	};
	//=========================================================

	var deactivateTool = function() {
		cursorPreview.remove();
	};
	
	return {
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};