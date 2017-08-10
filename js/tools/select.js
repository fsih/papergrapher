// select tool
// adapted from resources on http://paperjs.org and 
// https://github.com/memononen/stylii

pg.tools.registerTool({
	id: 'select',
	name: 'Item select',
	usedKeys : {
		toolbar : 'v',
		selectAll : 'ctrl-a',
		invertSelection: 'ctrl-i',
		groupSelection : 'ctrl-g',
		ungroupSelection : 'ctrl-shift-g',
		copySelection: 'ctrl-c',
		pasteSelection : 'ctrl-v'
	}
});

pg.tools.select = function() {
	var tool;
	var keyModifiers = {};
			
	var boundsPath;
	var boundsScaleHandles = [];
	var boundsRotHandles = [];
	 
	var options = {};
	
	var components = {};
	
	var menuEntries = {
		editTitle: {
			type : 'title',
			text :'Edit'
		},
		copySelection: {
			type: 'button',
			label: 'Copy',
			click: 'pg.edit.copySelectionToClipboard'
		},
		pasteSelection: {
			type: 'button',
			label: 'Paste',
			click: 'pg.edit.pasteObjectsFromClipboard'
		},
		deleteSelection: {
			type: 'button',
			label: 'Delete',
			click: 'pg.selection.deleteSelection'
		},
		selectionTitle: {
			type : 'title',
			text :'Select'
		},
		selectAll: {
			type: 'button',
			label: 'Select all',
			click: 'pg.selection.selectAllItems'
		},
		selectNone: {
			type: 'button',
			label: 'Deselect all',
			click: 'pg.selection.clearSelection'
		},
		invertSelection: {
			type: 'button',
			label: 'Invert selection',
			click: 'pg.selection.invertItemSelection'
		},
		randomSelection: {
			type: 'button',
			label: 'Random items',
			click: 'pg.selection.selectRandomItems'
		},
		groupingTitle: {
			type : 'title',
			text :'Group'
		},
		groupSelection: {
			type: 'button',
			label: 'Group',
			click: 'pg.group.groupSelection'
		},
		ungroupSelection: {
			type: 'button',
			label: 'Ungroup',
			click: 'pg.group.ungroupSelection'
		},
		layerTitle: {
			type : 'title',
			text :'Layer'
		},
		moveToLayer: {
			type: 'button',
			label: 'Move to active Layer',
			click: 'pg.layer.addSelectedItemsToActiveLayer'
		},
		orderTitle: {
			type : 'title',
			text :'Order'
		},
		bringToFront: {
			type: 'button',
			label: 'Bring to front',
			click: 'pg.order.bringSelectionToFront'
		},
		sendToBack: {
			type: 'button',
			label: 'Send to back',
			click: 'pg.order.sendSelectionToBack'
		},
		compoundTitle: {
			type : 'title',
			text :'Compound path'
		},
		createCompoundPath: {
			type: 'button',
			label: 'Create compound path',
			click: 'pg.compoundPath.createFromSelection'
		},
		releaseCompoundPath: {
			type: 'button',
			label: 'Release compound path',
			click: 'pg.compoundPath.releaseSelection'
		},
		booleanTitle: {
			type : 'title',
			text :'Boolean operations'
		},
		booleanUnite: {
			type: 'button',
			label: 'Unite',
			click: 'pg.boolean.booleanUnite'
		},
		booleanIntersect: {
			type: 'button',
			label: 'Intersect',
			click: 'pg.boolean.booleanIntersect'
		},
		booleanSubtract: {
			type: 'button',
			label: 'Subtract',
			click: 'pg.boolean.booleanSubtract'
		},
		booleanExclude: {
			type: 'button',
			label: 'Exclude',
			click: 'pg.boolean.booleanExclude'
		},
		booleanDivide: {
			type: 'button',
			label: 'Divide',
			click: 'pg.boolean.booleanDivide'
		},
		textTitle: {
			type: 'title',
			text: 'Text'
		},
		convertButton: {
			type: 'button',
			label: 'Text to outlines',
			click: 'pg.text.convertSelectionToOutlines'
		}
	};

	var simpleMenuEntries = {
		selectAll: {
			type: 'button',
			label: 'Select all',
			click: 'pg.selection.selectAllSegments',
			shouldShow: pg.selection.shouldShowSelectAll
		},
		selectNone: {
			type: 'button',
			label: 'Deselect all',
			click: 'pg.selection.clearSelection',
			shouldShow: pg.selection.shouldShowIfSelection
		},
		copySelection: {
			type: 'button',
			label: 'Copy',
			click: 'pg.edit.copySelectionToClipboard',
			shouldShow: pg.selection.shouldShowIfSelection
		},
		pasteSelection: {
			type: 'button',
			label: 'Paste',
			click: 'pg.edit.pasteObjectsFromClipboard',
			shouldShow: pg.edit.shouldShowPaste
		},
		deleteSelection: {
			type: 'button',
			label: 'Delete',
			click: 'pg.selection.deleteSelection',
			shouldShow: pg.selection.shouldShowIfSelection
		},
		groupSelection: {
			type: 'button',
			label: 'Group',
			click: 'pg.group.groupSelection',
			shouldShow: pg.group.shouldShowGroup
		},
		ungroupSelection: {
			type: 'button',
			label: 'Ungroup',
			click: 'pg.group.ungroupSelection',
			shouldShow: pg.group.shouldShowUngroup
		},
		bringForward: {
			type: 'button',
			label: 'Bring forward',
			click: 'pg.order.bringForward',
			shouldShow: pg.order.shouldShowBringForward
		},
		sendBackward: {
			type: 'button',
			label: 'Send backward',
			click: 'pg.order.sendBackward',
			shouldShow: pg.order.shouldShowSendBackward
		}
	};

	var activateTool = function() {
		pg.selection.clearSelection();
		setSelectionBounds();
		preProcessSelection();
		tool = new Tool();
		tolerance = 6;

		var hitOptions = {
			segments: true,
			stroke: true,
			curves: true,
			fill: true,
			guide: false
		};
		var getHitOptions = function() {
			hitOptions.tolerance = tolerance / paper.view.zoom;
			return hitOptions;
		};

		var mode = 'none';
		var selectionRect;

		var itemGroup;
		var pivot;
		var corner;
		var origPivot;
		var origSize;
		var origCenter;
		var scaleItems;
		var scaleItemsInsertBelow;
		
		var rotItems = [];
		var rotGroupPivot;
		var prevRot = [];

		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			pg.hover.clearHoveredItem();
			
			var hitResults = paper.project.hitTestAll(event.point, getHitOptions());
			// Prefer rotate to trigger over scale, since their regions somewhat overlap
			if (hitResults && hitResults.length > 0) {
				var hitResult = hitResults[0];
				for (var i = 0; i < hitResults.length; i++) {
					if (hitResults[i].item.data && hitResults[i].item.data.isRotHandle) {
						hitResult = hitResults[i];
						mode = 'rotate';
						break;
					} else if (hitResults[i].item.data && hitResults[i].item.data.isScaleHandle) {
						hitResult = hitResults[i];
						mode = 'scale';
					}
				}
				if (mode === 'rotate') {
					rotGroupPivot = boundsPath.bounds.center;
					rotItems = pg.selection.getSelectedItems();
					
					jQuery.each(rotItems, function(i, item) {
						prevRot[i] = (event.point - rotGroupPivot).angle;
					});
				} else if (mode === 'scale') {
					var index = hitResult.item.data.index;					
					pivot = boundsPath.bounds[getOpposingRectCornerNameByIndex(index)].clone();
					origPivot = boundsPath.bounds[getOpposingRectCornerNameByIndex(index)].clone();
					corner = boundsPath.bounds[getRectCornerNameByIndex(index)].clone();
					origSize = corner.subtract(pivot);
					origCenter = boundsPath.bounds.center;
					scaleItems = pg.selection.getSelectedItems();
				} 
				else { // Move mode
					// deselect all by default if the shift key isn't pressed
					// also needs some special love for compound paths and groups,
					// as their children are not marked as "selected"
					// deselect a currently selected item if shift is pressed
					var root = pg.item.getRootItem(hitResult.item);
					if(pg.item.isCompoundPathItem(root) || pg.group.isGroup(root)) {
						if(!root.selected) {
							if (!event.modifiers.shift) {
								pg.selection.clearSelection()
							}
							root.selected = true;
							for (var i = 0; i < root.children.length; i++) {
								root.children[i].selected = true;
							}
							jQuery(document).trigger('SelectionChanged');
							if(event.modifiers.alt) {
								mode = 'cloneMove';
								pg.selection.cloneSelection();

							} else {
								mode = 'move';
							}
						} else {
							if (event.modifiers.shift) {
								root.selected = false;
								for (var i = 0; i < root.children.length; i++) {
									root.children[i].selected = false;
								}
							} else {
								if(event.modifiers.alt) {
									mode = 'cloneMove';
									pg.selection.cloneSelection();

								} else {
									mode = 'move';
								}
							}
						}
					} else if(hitResult.item.selected) {
						if (event.modifiers.shift) {
							pg.selection.setItemSelection(hitResult.item, false);
						} else {
							if(event.modifiers.alt) {
								mode = 'cloneMove';
								pg.selection.cloneSelection();

							} else {
								mode = 'move';
							}
						}
					} else {
						if (!event.modifiers.shift) {
							pg.selection.clearSelection()
						}
						pg.selection.setItemSelection(hitResult.item, true);

						if(event.modifiers.alt) {
							mode = 'cloneMove';
							pg.selection.cloneSelection();

						} else {
							mode = 'move';
						}
					}
				}
				// while transforming object, never show the bounds stuff
				removeBoundsPath();
			} else {
				if (!event.modifiers.shift) {
					removeBoundsPath();
					pg.selection.clearSelection();
				}
				mode = 'rectSelection';
			}

		};

		tool.onMouseMove = function(event) {			
			pg.hover.handleHoveredItem(getHitOptions(), event);
		};

		
		tool.onMouseDrag = function(event) {
			if(event.event.button > 0) return; // only first mouse button
			
			var modOrigSize = origSize;
			
			if(mode == 'rectSelection') {
				selectionRect = pg.guides.rectSelect(event);
				// Remove this rect on the next drag and up event
				selectionRect.removeOnDrag();

			} else if(mode == 'scale') {
				// get index of scale items
				var items = paper.project.getItems({
					'match': function(item) {
						if (item instanceof Layer) {
							return false;
						}
						for (var i = 0; i < scaleItems.length; i++) {
							if (!scaleItems[i].isBelow(item)) {
								return false;
							}
						}
						return true;
					}
				});
				if (items.length > 0) {
					// Lowest item above all scale items in z index
					scaleItemsInsertBelow = items[0];
				}

				itemGroup = new paper.Group(scaleItems);
				itemGroup.insertBelow(scaleItemsInsertBelow);
				itemGroup.addChild(boundsPath);
				itemGroup.data.isHelperItem = true;
				itemGroup.strokeScaling = false;
				itemGroup.applyMatrix = false;

				if (event.modifiers.alt) {
					pivot = origCenter;
					modOrigSize = origSize*0.5;
				} else {
					pivot = origPivot; 
				}

				corner = corner.add(event.delta);
				var size = corner.subtract(pivot);
				var sx = 1.0, sy = 1.0;
				if (Math.abs(modOrigSize.x) > 0.0000001) {
					sx = size.x / modOrigSize.x;
				}
				if (Math.abs(modOrigSize.y) > 0.0000001) {
					sy = size.y / modOrigSize.y;
				}

				if (event.modifiers.shift) {
					var signx = sx > 0 ? 1 : -1;
					var signy = sy > 0 ? 1 : -1;
					sx = sy = Math.max(Math.abs(sx), Math.abs(sy));
					sx *= signx;
					sy *= signy;
				}

				itemGroup.scale(sx, sy, pivot);
				
				jQuery.each(boundsScaleHandles, function(index, handle) {
					handle.position = itemGroup.bounds[getRectCornerNameByIndex(index)];
					handle.bringToFront();
				});
				
				jQuery.each(boundsRotHandles, function(index, handle) {
					if(handle) {
						handle.position = itemGroup.bounds[getRectCornerNameByIndex(index)]+handle.data.offset;
						handle.bringToFront();
					}
				});
				
			} else if(mode == 'rotate') {
				var rotAngle = (event.point - rotGroupPivot).angle;
				
				jQuery.each(rotItems, function(i, item) {
					
					if(!item.data.origRot) {
						item.data.origRot = item.rotation;
					}
					
					if(event.modifiers.shift) {
						rotAngle = Math.round(rotAngle / 45) *45;
						item.applyMatrix = false;
						item.pivot = rotGroupPivot;
						item.rotation = rotAngle;
						
					} else {
						item.rotate(rotAngle - prevRot[i], rotGroupPivot);
					}
					prevRot[i] = rotAngle;
				});
				
			} else if(mode == 'move' || mode == 'cloneMove') {
				
				var dragVector = (event.point - event.downPoint);
				var selectedItems = pg.selection.getSelectedItems();

				for(var i=0; i<selectedItems.length; i++) {
					var item = selectedItems[i];
					// add the position of the item before the drag started
					// for later use in the snap calculation
					if(!item.data.origPos) {
						item.data.origPos = item.position;
					}

					if (event.modifiers.shift) {
						item.position = item.data.origPos + 
						pg.math.snapDeltaToAngle(dragVector, Math.PI*2/8);

					} else {
						item.position += event.delta;
					}
				}
			}
		};

		tool.onMouseUp = function(event) {
			if(event.event.button > 0) return; // only first mouse button
			
			if(mode == 'rectSelection' && selectionRect) {
				pg.selection.processRectangularSelection(event, selectionRect);
				selectionRect.remove();
				
			} else if(mode == 'move' || mode == 'cloneMove') {
				
				// resetting the items origin point for the next usage
				var selectedItems = pg.selection.getSelectedItems();

				jQuery.each(selectedItems, function(index, item) {
					// remove the orig pos again
					item.data.origPos = null;			
				});
				pg.undo.snapshot('moveSelection');
				
			} else if(mode == 'scale') {
				if (itemGroup) {
					itemGroup.applyMatrix = true;
					
					// mark text items as scaled (for later use on font size calc)
					for(var i=0; i<itemGroup.children.length; i++) {
						var child = itemGroup.children[i];
						if(child.data.isPGTextItem) {
							child.data.wasScaled = true;
						}
					}

					if (scaleItemsInsertBelow) {
						// No increment step because itemGroup.children is getting depleted
						for (var i = 0; i < itemGroup.children.length;) {
							itemGroup.children[i].insertBelow(scaleItemsInsertBelow);
						}
						scaleItemsInsertBelow = null;
					} else if (itemGroup.layer) {
					 	itemGroup.layer.addChildren(itemGroup.children);
					}
					itemGroup.remove();
					pg.undo.snapshot('scaleSelection');
				}
				
			} else if(mode == 'rotate') {
				jQuery.each(rotItems, function(i, item) {
					item.applyMatrix = true;
				});
				pg.undo.snapshot('rotateSelection');
			}
			
			mode = 'none';
			selectionRect = null;
			
			if(pg.selection.getSelectedItems().length <= 0) {
				removeBoundsPath();
			} else {
				setSelectionBounds();
			}
		};
		
		tool.onKeyDown = function(event) {
			keyModifiers[event.key] = true;
		};
		
		tool.onKeyUp = function(event) {
			
			if(keyModifiers.control && keyModifiers.shift) {
				if(event.key == 'g') {
					pg.group.ungroupSelection();
				}
				
			} else if(keyModifiers.control) {
				if(event.key == 'a') {
					pg.selection.selectAllItems();
				} else if(event.key == 'i') {
					pg.selection.invertItemSelection();
				} else if(event.key == 'g') {
					pg.group.groupSelection();
				} else if(event.key == 'c') {
					pg.edit.copySelectionToClipboard();
				} else if(event.key == 'v') {
					pg.edit.pasteObjectsFromClipboard();
				}	
			}
			
			keyModifiers[event.key] = false;
		};
		
		jQuery(document).on('DeleteItems Undo Grouped Ungrouped SelectionChanged', function(){
			setSelectionBounds();
			setupToolEntries();
		});
		
		// setup floating tool options panel in the editor
		//pg.toolOptionPanel.setup(options, components, function(){ });

		setupToolEntries();
		tool.activate();
	};

	var setupToolEntries = function() {
		pg.menu.clearToolEntries();
		if (mode === "ORIGINAL") {
			pg.menu.setupToolEntries(menuEntries);
		} else {
			pg.menu.setupToolEntries(simpleMenuEntries);
		}		
	}

	var deactivateTool = function() {
		pg.hover.clearHoveredItem();
		removeBoundsPath();
		pg.menu.clearToolEntries();
		jQuery(document).off('DeleteItems Undo Grouped Ungrouped SelectionChanged');
	};
	
	
	var setSelectionBounds = function() {
		removeBoundsPath();
		
		var items = pg.selection.getSelectedItems();
		if(items.length <= 0) return;
		
		var rect;
		jQuery.each(items, function(index, item) {
			if(rect) {
				rect = rect.unite(item.bounds);
			} else {
				rect = item.bounds;
			}
		});
		
		if(!boundsPath) {
			boundsPath = new paper.Path.Rectangle(rect);
			boundsPath.curves[0].divideAtTime(0.5);
			boundsPath.curves[2].divideAtTime(0.5);
			boundsPath.curves[4].divideAtTime(0.5);
			boundsPath.curves[6].divideAtTime(0.5);
		}
		boundsPath.guide = true;
		boundsPath.data.isSelectionBound = true;
		boundsPath.data.isHelperItem = true;
		boundsPath.fillColor = null;
		boundsPath.strokeScaling = false;
		boundsPath.fullySelected = true;
		boundsPath.parent = pg.layer.getGuideLayer();
		
		jQuery.each(boundsPath.segments, function(index, segment) {
			var size = 4;
			
			if(index%2 == 0) {
				size = 6;
			}
			
			if(index == 7) {
				var offset = new Point(0, 20);
				
				var arrows = new paper.Path("M19.28,1.09C19.28.28,19,0,18.2,0c-1.67,0-3.34,0-5,0-.34,0-.88.24-1,.47a1.4,1.4,0,0,0,.36,1.08,15.27,15.27,0,0,0,1.46,1.36A6.4,6.4,0,0,1,6.52,4,5.85,5.85,0,0,1,5.24,3,15.27,15.27,0,0,0,6.7,1.61,1.4,1.4,0,0,0,7.06.54C7,.3,6.44.07,6.1.06c-1.67,0-3.34,0-5,0C.28,0,0,.31,0,1.12c0,1.67,0,3.34,0,5a1.23,1.23,0,0,0,.49,1,1.22,1.22,0,0,0,1-.31A14.38,14.38,0,0,0,2.84,5.26l.73.62a9.45,9.45,0,0,0,7.34,2,9.45,9.45,0,0,0,4.82-2.05l.73-.62a14.38,14.38,0,0,0,1.29,1.51,1.22,1.22,0,0,0,1,.31,1.23,1.23,0,0,0,.49-1C19.31,4.43,19.29,2.76,19.28,1.09Z");
				arrows.translate(segment.point + offset + [-10.5, -5]);
				
				var line = new paper.Path.Rectangle(
					segment.point + offset - [1,0],
					segment.point + [1,0]);

				var rotHandle = arrows.unite(line);
				line.remove();
				arrows.remove();
				rotHandle.scale(1/paper.view.zoom, segment.point);
				rotHandle.data = {
					offset: offset,
					isRotHandle: true,
					isHelperItem: true,
					noSelect: true,
					noHover: true
				};
				rotHandle.fillColor = pg.guides.getGuideColor('blue');
				rotHandle.parent = pg.layer.getGuideLayer();
				boundsRotHandles[index] = rotHandle;
			}
			
			boundsScaleHandles[index] =
				new paper.Path.Rectangle({
					center: segment.point,
					data: {
						index:index,
						isScaleHandle: true,
						isHelperItem: true,
						noSelect: true,
						noHover: true
					},
					size: [size/paper.view.zoom,size/paper.view.zoom],
					fillColor: pg.guides.getGuideColor('blue'),
					parent: pg.layer.getGuideLayer()
				});
		});
	};
	
	
	var removeBoundsPath = function() {
		pg.guides.removeHelperItems();
		boundsPath = null;
		boundsScaleHandles.length = 0;
		boundsRotHandles.length = 0;
	};
	
	
	var preProcessSelection = function() {
		
		// when switching to the select tool while having a child object of a
		// compound path selected, deselect the child and select the compound path
		// instead. (otherwise the compound path breaks because of scale-grouping)
		var items = pg.selection.getSelectedItems();
		jQuery.each(items, function(index, item) {
			if(pg.compoundPath.isCompoundPathChild(item)) {
				var cp = pg.compoundPath.getItemsCompoundPath(item);
				pg.selection.setItemSelection(item, false);
				pg.selection.setItemSelection(cp, true);
			}
		});
		setSelectionBounds();
	};
	
	
	var getRectCornerNameByIndex = function(index) {
		switch(index) {
			case 0:
				return 'bottomLeft';
			
			case 1:
				return 'leftCenter';
				
			case 2:
				return 'topLeft';
			
			case 3:
				return 'topCenter';
			
			case 4:
				return 'topRight';
			
			case 5:
				return 'rightCenter';
			
			case 6:
				return 'bottomRight';
				
			case 7:
				return 'bottomCenter';
		}
	};
	
	var getOpposingRectCornerNameByIndex = function(index) {
		switch(index) {
			case 0:
				return 'topRight';
				
			case 1:
			 return 'rightCenter';
				
			case 2:
				return 'bottomRight';
				
			case 3:
				return 'bottomCenter';
			
			case 4:
				return 'bottomLeft';
				
			case 5:
				return 'leftCenter';
			
			case 6:
				return 'topLeft';
				
			case 7:
				return 'topCenter';
		}
	};

	
	
	return {
		options: options,
		activateTool: activateTool,
		deactivateTool: deactivateTool,
		setupToolEntries: setupToolEntries
	};
	
};
