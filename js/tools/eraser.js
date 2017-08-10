// TODO share code with brush

pg.tools.registerTool({
	id: 'eraser',
	name: 'Eraser'
});

pg.tools.eraser = function() {
	var blob =  new pg.blob();

	var options = {
		brushWidth: 20
	};
	
	var components = {
		brushWidth: {
			type: 'float',
			label: 'Eraser width',
			min: 0
		}
	};
	
	var activateTool = function() {
		// get options from local storage if present
		options = pg.tools.getLocalOptions(options);
		$('#eraserWidth').removeClass('hidden');
		$('#eraserInput').val(options.brushWidth);
		$('#eraserInput').on('input', function (event) {
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
		blob.activateTool(true /* isEraser */, tool, options);

		// setup floating tool options panel in the editor
		//pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};

	var deactivateTool = function() {
		blob.deactivateTool();
		$('#eraserWidth').addClass('hidden');
		$('#eraserInput').unbind('input');
	};
	
	return {
		options: options,
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};