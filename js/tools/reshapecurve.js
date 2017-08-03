// select tool
// adapted from resources on http://paperjs.org and 
// https://github.com/memononen/stylii

pg.tools.registerTool({
	id: 'reshapecurve',
	name: 'Reshape curve',
	usedKeys : {
		toolbar : 'a'
	}
});

pg.tools.reshapecurve = function() {
	var tool;
	var keyModifiers = {};
	
	var options = {};
	
	var menuEntries = {
		selectionTitle: {
			type : 'title',
			text :'Selection'
		},
		selectAll: {
			type: 'button',
			label: 'Select all',
			click: 'pg.selection.selectAllSegments'
		},
		selectNone: {
			type: 'button',
			label: 'Deselect all',
			click: 'pg.selection.clearSelection'
		},
		invertSelection: {
			type: 'button',
			label: 'Invert selection',
			click: 'pg.selection.invertSegmentSelection'
		},
		segmentTitle: {
			type : 'title',
			text :'Segment'
		},
		switchHandles: {
			type: 'button',
			label: 'Switch handles',
			click: 'pg.selection.switchSelectedHandles'
		},
		removeSegments: {
			type: 'button',
			label: 'Remove points',
			click: 'pg.selection.removeSelectedSegments'
		},
		splitPath: {
			type: 'button',
			label: 'Split path',
			click: 'pg.selection.splitPathAtSelectedSegments'
		},
		
	};

	var simpleMenuEntries = {
		selectAll: {
			type: 'button',
			label: 'Select all',
			click: 'pg.selection.selectAllSegments'
		},
		selectNone: {
			type: 'button',
			label: 'Deselect all',
			click: 'pg.selection.clearSelection'
		},
		removeSegments: {
			type: 'button',
			label: 'Remove points',
			click: 'pg.selection.removeSelectedSegments'
		},
		splitPath: {
			type: 'button',
			label: 'Split path',
			click: 'pg.selection.splitPathAtSelectedSegments'
		}
	};

	var activateTool = function() {		
		tool = new Tool();
		paper.settings.handleSize = 8;
				
		var hitOptions = {
			match: function(item) {
				if (item.type === 'handle-out' || item.type === 'handle-in') {
					// Only hit test against handles that are visible, that is,
					// their segment is selected
					if (!item.segment.selected) {
						return false;
					}
					// If the entire shape is selected, handles are hidden
					if (item.item.fullySelected) {
						return false;
					}
				}
				return true;
			},
			segments: true,
			stroke: true,
			curves: true,
			handles: true,
			fill: true,
			guide: false,
			tolerance: 8 / paper.view.zoom
		};

		// TODO class needs to be refactored to get rid of all this flaky state
		var lastHitResult;
		var selectionRect;
		
		var hitType;
		
		var lastEvent = null;
		var selectionDragged = false;
		
		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return; // only first mouse button
			
			lastHitResult = null;
			hitType = null;
			selectionDragged = false;
			var doubleClicked = false;
			
			if(lastEvent) {
				if((event.event.timeStamp - lastEvent.event.timeStamp) < 250) {
					doubleClicked = true;
				} else {
					doubleClicked = false;
				}
			}
			lastEvent = event;
			
			pg.hover.clearHoveredItem();

			// Choose hit result ===========================================================
			var hitResults = paper.project.hitTestAll(event.point, hitOptions);
			if (hitResults.length === 0) {
				if (!event.modifiers.shift) {
					pg.selection.clearSelection();
				}
				return;
			}

			var hitResult = hitResults[0];
			for (var i = 0; i < hitResults.length; i++) {
				// Prefer hits on segments to other types of hits, to make sure handles are movable.
				if (hitResults[i].type === 'segment') {
					hitResult = hitResults[i];
					break;
				}
			}
			
			// dont allow detail-selection of PGTextItem
			if(hitResult && pg.item.isPGTextItem(pg.item.getRootItem(hitResult.item))) {
				return;
			}
			lastHitResult = hitResult;
			//===============================================================================

			// If item is not yet selected, don't behave differently depending on if they clicked a segment
			// or stroke (since those were invisible), just select the whole thing as if they clicked the fill.
			if (hitResult && !hitResult.item.selected) {
				if(event.modifiers.shift) {
					hitResult.item.fullySelected = true;
				} else {
					pg.selection.clearSelection();
					hitResult.item.selected = false;
					hitResult.item.fullySelected = true; // TODO: move this behavior to mouse up
					hitType = 'fill'
					if(event.modifiers.option) pg.selection.cloneSelection();
				}
			} else if (hitResult.type === 'fill' || (hitResult.type !== 'segment' && doubleClicked)) {
				hitType = 'fill';
				if(hitResult.item.selected) {
					if(event.modifiers.shift) {
						hitResult.item.fullySelected = false;
					}
					if(doubleClicked) {
						if (!event.modifiers.shift) {
							pg.selection.clearSelection();
						}
						hitResult.item.selected = false;
						hitResult.item.fullySelected = true;
					}
					if(event.modifiers.option) pg.selection.cloneSelection();
				} else {
					if(event.modifiers.shift) {
						hitResult.item.fullySelected = true;
					} else {
						paper.project.deselectAll();
						hitResult.item.fullySelected = true;


						if(event.modifiers.option) pg.selection.cloneSelection();
					}
				}

			} else if (hitResult.type === 'segment') {
				hitType = 'point';
 				
 				// Remove point
 				if (doubleClicked) {
 					var index = hitResult.segment.index
					hitResult.item.removeSegment(index);

				 	// Adjust handles of curve before and curve after to account for new curve length
					var beforeSegment = hitResult.item.segments[index - 1];
					var afterSegment = hitResult.item.segments[index];
					var curveLength = beforeSegment ? beforeSegment.curve ? beforeSegment.curve.length : undefined : undefined;
					if (beforeSegment && beforeSegment.handleOut) {
						if (!afterSegment) {
							beforeSegment.handleOut = null;
						} else {
							beforeSegment.handleOut = beforeSegment.handleOut / beforeSegment.handleOut.length * curveLength/2;
						}
					}
					if (afterSegment && afterSegment.handleIn) {
						if (!beforeSegment) {
							afterSegment.handleIn = null;
						} else {
							afterSegment.handleIn = afterSegment.handleIn / afterSegment.handleIn.length * curveLength/2;
						}
					}

					return;
				}

				if(hitResult.segment.selected) {
					// selected points with no handles get handles if selected again
					if (event.modifiers.shift) {
						hitResult.segment.selected = false;
					} else {
						paper.project.deselectAll();
						hitResult.segment.selected = true;
					}
				} else {
					if(event.modifiers.shift) {
						hitResult.segment.selected = true;
					} else {
						paper.project.deselectAll();
						hitResult.segment.selected = true;
					}
				}
				
				if(event.modifiers.option) pg.selection.cloneSelection(); // TODO ??
			} else if (
				hitResult.type === 'stroke' || 
				hitResult.type === 'curve') {
				hitType = 'point';

				var item = hitResult.item;
				if (!item.selected) {
					if (event.modifiers.shift) {
						item.selected = !item.selected;
					} else {
					 	paper.project.deselectAll();
					 	item.selected = true;
					}
				} else {
					// Length of curve from previous point to new point
					var beforeCurveLength = hitResult.location.curveOffset;
					var afterCurveLength = hitResult.location.curve.length - hitResult.location.curveOffset;

					// Handle length based on curve length until next point
					var handleIn = -hitResult.location.tangent * beforeCurveLength / 2;
					var handleOut = hitResult.location.tangent * afterCurveLength / 2;
					// Don't let one handle overwhelm the other (results in path doubling back on itself weirdly)
					if (handleIn.length > 3 * handleOut.length) {
						handleIn = handleIn/handleIn.length * 3 * handleOut.length;
					}
					if (handleOut.length > 3 * handleIn.length) {
						handleOut = handleOut/handleOut.length * 3 * handleIn.length;
					}

					var beforeSegment = hitResult.item.segments[hitResult.location.index];
					var afterSegment = hitResult.item.segments[hitResult.location.index + 1];

					// Add segment
				 	var segment = hitResult.item.insert(hitResult.location.index + 1, 
				 		new Segment(hitResult.location.point, handleIn, handleOut));

				 	// Adjust handles of curve before and curve after to account for new curve length
				 	if (beforeSegment && beforeSegment.handleOut) {
						if (!afterSegment) {
							beforeSegment.handleOut = null;
						} else {
							beforeSegment.handleOut = beforeSegment.handleOut / beforeSegment.handleOut.length * beforeCurveLength/2;
						}
					}
					if (afterSegment && afterSegment.handleIn) {
						if (!beforeSegment) {
							afterSegment.handleIn = null;
						} else {
							afterSegment.handleIn = afterSegment.handleIn / afterSegment.handleIn.length * afterCurveLength/2;
						}
					}

					if (event.modifiers.shift) {
						segment.selected = !segment.selected;
					} else {
					 	paper.project.deselectAll();
					 	segment.selected = true;
					}
				}
			} else if(
				hitResult.type === 'handle-in' || 
				hitResult.type === 'handle-out') {
				hitType = hitResult.type;

				if(!event.modifiers.shift) {
					paper.project.deselectAll();
				}
				
				hitResult.segment.handleIn.selected = true;
				hitResult.segment.handleOut.selected = true;

				var seg = hitResult.segment;
			}
			pg.statusbar.update();
			pg.stylebar.updateFromSelection(true /* recursive */);
			pg.stylebar.blurInputs();
		
		jQuery(document).trigger('SelectionChanged');
		
		};
		
		tool.onMouseMove = function(event) {
			pg.hover.handleHoveredItem(hitOptions, event);
		};
		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return; // only first mouse button
			if(!lastHitResult) {
				selectionRect = pg.guides.rectSelect(event);
				// Remove this rect on the next drag and up event
				selectionRect.removeOnDrag();

			} else {
				selectionDragged = true;
				if (hitType === 'point') {
					if (lastHitResult.segment) {
						lastHitResult.segment.selected = true;
					}
				}
				
				var selectedItems = pg.selection.getSelectedItems(true /* recursive */);
				var dragVector = (event.point - event.downPoint);
				
				for(var i=0; i < selectedItems.length; i++) {
					var item = selectedItems[i];

					// move
					if(hitType === 'fill' || !item.segments) {
						
						// if the item has a compound path as a parent, don't move its
						// own item, as it would lead to double movement
						if(item.parent && pg.compoundPath.isCompoundPath(item.parent)) {
							continue;
						}
						
						// add the position of the item before the drag started
						// for later use in the snap calculation
						if(!item.origPos) {
							item.origPos = item.position;
						}

						if (event.modifiers.shift) {
							item.position = item.origPos + 
							pg.math.snapDeltaToAngle(dragVector, Math.PI*2/8);

						} else {
							item.position += event.delta;
						}
					// reshape
					} else {
						for(var j=0; j < item.segments.length; j++) {
							var seg = item.segments[j];
							// add the point of the segment before the drag started
							// for later use in the snap calculation
							if(!seg.origPoint) {
								seg.origPoint = seg.point.clone();
							}

							var pathChanged = false;
							if( seg.selected && (
								hitType === 'point' || 
								hitType === 'stroke' || 
								hitType === 'curve')){

								if (event.modifiers.shift) {
									seg.point = seg.origPoint + 
									pg.math.snapDeltaToAngle(dragVector, Math.PI*2/8);

								} else {
									seg.point += event.delta;
								}
								pathChanged = true;
							} else if(seg.handleOut.selected && 
								hitType === 'handle-out'){
								//if option is pressed or handles have been split, 
								//they're no longer parallel and move independently
								if( event.modifiers.option ||
									!seg.handleOut.isColinear(seg.handleIn)) {
									seg.handleOut += event.delta;

								} else {
									var oldLength = seg.handleOut.length;
									seg.handleOut += event.delta;
									seg.handleIn = -seg.handleOut * seg.handleIn.length/oldLength;
								}
								pathChanged = true;
							} else if(seg.handleIn.selected && 
								hitType === 'handle-in') {

								//if option is pressed or handles have been split, 
								//they're no longer parallel and move independently
								if( event.modifiers.option ||
									!seg.handleOut.isColinear(seg.handleIn)) {
									seg.handleIn += event.delta;

								} else {
									var oldLength = seg.handleIn.length;
									seg.handleIn += event.delta;
									seg.handleOut = -seg.handleIn * seg.handleOut.length/oldLength;
								}	
								pathChanged = true;
							}

							/*if (pathChanged) {
 								var startIndex = j-1;
								var endIndex = j+1;
								var endInHandle, startOutHandle, startInHandle; // Have to do start in handle because there's weird asymmetry in smooth()
								console.log('j '+j);
								if (item.closed) {
									startIndex = (startIndex + item.segments.length) % item.segments.length; // To make sure the mod is positive
									endIndex = endIndex % item.segments.length;

									// If handle is smooth, make this one movable too
									if (item.segments[startIndex].handleOut.isColinear(item.segments[startIndex].handleIn)) {
										startIndex = (startIndex - 1 + item.segments.length) % item.segments.length;
									}
									if (item.segments[endIndex].handleOut.isColinear(item.segments[endIndex].handleIn)) {
										endIndex = (endIndex + 1) % item.segments.length;
									}

									if (startIndex === endIndex) {
										item.smooth();
									} else {
										item.smooth({from: startIndex, to: endIndex});
										endInHandle = item.segments[endIndex].handleIn.clone();
										startOutHandle = item.segments[startIndex].handleOut.clone();
										startInHandle = item.segments[startIndex].handleIn.clone();
									}
								} else {
									endIndex = endIndex >= item.segments.length ? undefined : endIndex;
									startIndex = startIndex < 0 ? undefined : startIndex;
									// If handle is smooth, make this one movable too
									if (startIndex !== undefined && !item.segments[startIndex].handleIn.isZero() && !item.segments[startIndex].handleOut.isZero() && item.segments[startIndex].handleOut.isColinear(item.segments[startIndex].handleIn)) {
										startIndex = startIndex - 1 < 0 ? undefined : startIndex - 1;
									}
									if (endIndex !== undefined && !item.segments[endIndex].handleIn.isZero() && !item.segments[endIndex].handleOut.isZero() && item.segments[endIndex].handleOut.isColinear(item.segments[endIndex].handleIn)) {
										endIndex = endIndex + 1 >= item.segments.length ? undefined : endIndex + 1;
									}

									endInHandle = endIndex === undefined ? undefined : item.segments[endIndex].handleIn.clone();
									startOutHandle = startIndex === undefined ? undefined : item.segments[startIndex].handleOut.clone();
									startInHandle = startIndex === undefined ? undefined : item.segments[startIndex].handleIn.clone();
									item.smooth({from: Math.max(0, startIndex), to: Math.min(item.segments.length - 1, endIndex)});
								}
								if (endInHandle) {
									item.segments[endIndex].handleIn = endInHandle;
								}
								if (startOutHandle) {
									item.segments[startIndex].handleOut = startOutHandle;
								}
								if (startInHandle) {
									item.segments[startIndex].handleIn = startInHandle;
								}
							}*/
						}
					}
				}
			}
		};

		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return; // only first mouse button
		
			if(!lastHitResult && selectionRect) {
				pg.selection.processRectangularSelection(event, selectionRect, 'detail');
				selectionRect.remove();
				
			} else {
				
				if(selectionDragged) {
					pg.undo.snapshot('moveSelection');
					selectionDragged = false;
				}
				
				// resetting the items and segments origin points for the next usage
				var selectedItems = pg.selection.getSelectedItems();

				for(var i=0; i < selectedItems.length; i++) {
					var item = selectedItems[i];
					// for the item
					item.origPos = null;
					// and for all segments of the item
					if(item.segments) {
						for(var j=0; j < item.segments.length; j++) {
							var seg = item.segments[j];
								seg.origPoint = null;
						}
					}
				}
			}
			
			selectionRect = null;

		};
		
		tool.onKeyDown = function(event) {
			keyModifiers[event.key] = true;
		};
		
		tool.onKeyUp = function(event) {
			if(keyModifiers.control) {
				if(event.key == 'a') {
					pg.selection.selectAllSegments();
				} else if(event.key == 'i') {
					pg.selection.invertSegmentSelection();
				}
			}
			keyModifiers[event.key] = false;
		};
		
		// setup floating tool options panel in the editor
		//pg.toolOptionPanel.setup(options, components, function(){ });
		
		if (mode === "ORIGINAL") {
			pg.menu.setupToolEntries(menuEntries);
		} else {
			pg.menu.setupToolEntries(simpleMenuEntries);
		}	
		tool.activate();
	};

	
	var deactivateTool = function() {
		paper.settings.handleSize = 0;
		pg.hover.clearHoveredItem();
		pg.menu.clearToolEntries();
	};


	return {
		options: options,
		activateTool: activateTool,
		deactivateTool: deactivateTool
	};
	
};