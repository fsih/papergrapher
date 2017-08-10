pg.tools.registerTool({
	id: 'broadbrush',
	name: 'Brush'
});

pg.tools.broadbrush = function() {
	var blob =  new pg.blob();

	var options = {
		brushWidth: 5
	};
	
	var components = {
		brushWidth: {
			type: 'float',
			label: 'Brush width',
			min: 0
		}
	};
	
	var activateTool = function() {
		// TODO: Instead of clearing selection, consider a kind of "draw inside"
		// analogous to how selection works with eraser
		pg.selection.clearSelection();

		// get options from local storage if present
		options = pg.tools.getLocalOptions(options);
		$('#brushWidth').removeClass('hidden');
		$('#brushInput').val(options.brushWidth);
		$('#brushInput').on('input', function (event) {
			var eventValue = parseInt(event.currentTarget.value);
			if (isNaN(eventValue)) eventValue = 0;
			if (eventValue === options.brushWidth) {
				return;
			} else if (eventValue > parseInt(event.currentTarget.max)) {
				eventValue = event.currentTarget.max;
			} else if (eventValue < parseInt(event.currentTarget.min)) {
				eventValue = event.currentTarget.min;
			}
			options.brushWidth = eventValue;
			pg.tools.setLocalOptions(options);
		});

		var tool = new Tool();
		blob.activateTool(false /* isEraser */, tool, options);

		// Make sure a fill color is set on the brush
		if(!pg.stylebar.getFillColor()) {
			pg.stylebar.setFillColor(pg.stylebar.getStrokeColor());
			pg.stylebar.setStrokeColor(null);
		}

		// setup floating tool options panel in the editor
		//pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};

	var deactivateTool = function() {
		blob.deactivateTool();
		$('#brushWidth').addClass('hidden');
		$('#brushInput').unbind('input');
	};
	
	return {
		options: options,
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};