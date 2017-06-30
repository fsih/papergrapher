pg.blob = function() {
	var tool;
	var options;
	var cursorPreview;
	var brushSize;

	var brush;
	var BROAD = "broadbrush";
	var SEGMENT = "segmentbrush";

	var isEraser;
	
	var activateTool = function(isEraser, tool, options) {
		this.tool = tool;
		this.options = options;
		// brush size >= threshold use segment brush, else use broadbrush
		// Segment brush has performance issues at low threshold, but broad brush has weird corners
		// which are more obvious the bigger it is
		var THRESHOLD = 10;
		
		cursorPreview = new Path.Circle({
		    center: [-10000, -10000],
		    radius: options.brushWidth/2,
		});
		brushSize = options.brushWidth;

		tool.stylePath = function(path) {
			if (isEraser) {
				path.fillColor = 'white';
				if (path === cursorPreview) {
					path.strokeColor = 'cornflowerblue';
					path.strokeWidth = 1;
				}
			} else {
				// TODO keep a separate active toolbar style for brush vs pen?
				path = pg.stylebar.applyActiveToolbarStyle(path);
			}
		};

		tool.stylePath(cursorPreview);

		tool.fixedDistance = 1;

		pg.broadbrushhelper(tool, options);
		pg.segmentbrushhelper(tool, options);
		tool.onMouseMove = function(event) {
			if (brushSize !== options.brushWidth) {
				cursorPreview.remove();
				cursorPreview = new Path.Circle({
				    center: event.point,
				    radius: options.brushWidth/2,
				});
				brushSize = options.brushWidth;
			}
			tool.stylePath(cursorPreview);
			cursorPreview.bringToFront();
			cursorPreview.position = event.point;
		};
		
		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button

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
			if(event.event.button > 0) return;  // only first mouse button
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
			if(event.event.button > 0) return;  // only first mouse button
			
			var lastPath;
			if (brush === BROAD) {
				lastPath = this.onBroadMouseUp(event);
			} else if (brush === SEGMENT) {
				lastPath = this.onSegmentMouseUp(event);
			} else {
				console.warn("Brush type does not exist: ", brush);
			}

			if (!isEraser) {
				tool.mergeBrush(lastPath);
			} else {
				tool.mergeEraser(lastPath);
			}

			cursorPreview.bringToFront();
			cursorPreview.position = event.point;

			// Reset
			brush = undefined;
			tool.fixedDistance = 1;
		};

		tool.mergeBrush = function(lastPath) {
			// Get all path items to merge with
			var paths = paper.project.getItems({
			    'match': function(item) {
			    	return tool.isMergeable(lastPath, item);
			    }
			});

			var mergedPath = lastPath;
			// Move down z order to first overlapping item
			for (var i = paths.length - 1; i >= 0 && !tool.touches(paths[i], lastPath); i--) {
				continue;
			}
			var mergedPathIndex = i;
			for (; i >= 0; i--) {
				if (!tool.touches(paths[i], lastPath)) {
					continue;
				}
				if (!paths[i].getFillColor()) {
					// Ignore for merge. Paths without fill need to be in paths though, since they can visibly change if z order changes
				} else if (tool.colorMatch(paths[i], lastPath)) {
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
					if (mergedPath === lastPath) {
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

		tool.mergeEraser = function(lastPath) {
			// Get all path items to merge with
			// If there are selected items, try to erase from amongst those.
			var items = paper.project.getItems({
			    'match': function(item) {
			    	return item.selected && tool.isMergeable(lastPath, item) && tool.touches(lastPath, item);
			    }
			});
			// Eraser didn't hit anything selected, so assume they meant to erase from all instead of from subset and deselect
			// the selection
			if (items.length === 0) {
				pg.selection.clearSelection();
				items = paper.project.getItems({
				    'match': function(item) {
				    	return tool.isMergeable(lastPath, item) && tool.touches(lastPath, item);
				    }
				});
			}
			
			for (var i = items.length - 1; i >= 0; i--) {
				// Erase
				newPath = items[i].subtract(lastPath);

				// Gather path segments
				var subpaths = [];
				if (items[i] instanceof PathItem && !items[i].closed) {
					var firstSeg = items[i].clone();
					var intersections = firstSeg.getIntersections(lastPath);
					// keep first and last segments
					if (intersections.length === 0) {
						continue;
					}
					for (var j = intersections.length - 1; j >= 0; j--) {
						subpaths.push(firstSeg.splitAt(intersections[j]));
					}
					subpaths.push(firstSeg);
				}

				// Remove the ones that are within the eraser stroke boundary, or are already part of new path.
				// This way subpaths only remain if they didn't get turned into a shape by subtract.
				for (var k = subpaths.length - 1; k >= 0; k--) {
					var segMidpoint = subpaths[k].getLocationAt(subpaths[k].length/2).point;
					if (lastPath.contains(segMidpoint) || newPath.contains(segMidpoint)) {
						subpaths[k].remove();
						subpaths.splice(k, 1);
					}
				}

				// Divide topologically separate shapes into their own compound paths, instead of
				// everything being stuck together.
				// Assume that result of erase operation returns clockwise paths for positive shapes
				var clockwiseChildren = [];
				var ccwChildren = [];
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
					    	if (tool.firstEnclosesSecond(ccw, cw) || tool.firstEnclosesSecond(cw, ccw)) {
					    		var temp = newCw.subtract(ccw);
					    		temp.insertAbove(newCw);
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
			lastPath.remove();
			pg.undo.snapshot('eraser');
		};

		tool.colorMatch = function(existingPath, addedPath) {
			// Note: transparent fill colors do notdetect as touching
			return existingPath.getFillColor().equals(addedPath.getFillColor()) 
			        && (addedPath.getStrokeColor() === existingPath.getStrokeColor() // both null 
			        	|| (addedPath.getStrokeColor() && addedPath.getStrokeColor().equals(existingPath.getStrokeColor()))) // both non-null and equal
			        && addedPath.getStrokeWidth() === existingPath.getStrokeWidth()
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
	};

	var deactivateTool = function() {
		cursorPreview.remove();
	};
	
	return {
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};