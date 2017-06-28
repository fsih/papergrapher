pg.tools.registerTool({
	id: 'broadbrush',
	name: 'Brush'
});

pg.tools.broadbrush = function() {
	var blob =  new pg.blob();

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
		var tool = new Tool();
		blob.activateTool(false /* isEraser */, tool, options);

		// Make sure a fill color is set on the brush
		if(!pg.stylebar.getFillColor()) {
			pg.stylebar.setFillColor(pg.stylebar.getStrokeColor());
			pg.stylebar.setStrokeColor(null);
		}

		// setup floating tool options panel in the editor
		pg.toolOptionPanel.setup(options, components, function() {});
		
		tool.activate();
	};

	var deactivateTool = function() {
		blob.deactivateTool();
	};
	
	return {
		options: options,
		activateTool : activateTool,
		deactivateTool : deactivateTool
	};
};