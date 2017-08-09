// eyedropper tool

pg.tools.registerTool({
	id: 'eyedropper',
	name: 'Eyedropper',
	usedKeys : {
		toolbar : 'i'
	}
});

pg.tools.eyedropper = function() {
	var tool;

	var options = {};

	var activateTool = function() {
				
		tool = new Tool();
			
		var tolerance = 5;
		var hitOptions = {
			segments: true,
			stroke: true,
			curves: true,
			fill: true,
			guide: false,
		};
		var getHitOptions = function() {
			hitOptions.tolerance = tolerance / paper.view.zoom;
			return hitOptions;
		};
		
		tool.onMouseDown = function(event) {
			if(event.event.button > 0) return;  // only first mouse button
			
			var hitResult = paper.project.hitTest(event.point, getHitOptions());
			if (hitResult) {
				if(event.modifiers.option) {
					pg.undo.snapshot('applyToolbarStyles');
					pg.stylebar.applyActiveToolbarStyle(hitResult.item);
					
				} else {
					pg.stylebar.updateFromItem(hitResult.item);

					pg.stylebar.applyFillColorToSelection(pg.stylebar.getFillColor());
					pg.stylebar.applyStrokeColorToSelection(pg.stylebar.getStrokeColor());
					pg.stylebar.applyStrokeWidthToSelection(jQuery('#strokeInput').val());
				}
			}
		};
		
		tool.onMouseMove = function(event) {
			pg.hover.handleHoveredItem(getHitOptions(), event);
		};
		
		tool.activate();
	};

	
	
	
	return {
		options: options,
		activateTool : activateTool,
	};
};