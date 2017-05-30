
pg.stylebar.getStrokeColor = function() {
	return null;
};

// mainly makes sure the user doesn't accidentally draw with no color or 
// no opacity
pg.stylebar.sanitizeSettings = function() {
	// if a tool is selected and the opacity value is empty, set it to 1
	// otherwise the user draws something with opacity 0 and sees nothing
	var opacity = jQuery('#opacityInput').val();
	if(opacity === "") {
		pg.stylebar.setOpacity(1);
	}
	var blendMode = jQuery('#blendModeSelect').val();
	if(blendMode === "") {
		pg.stylebar.setBlendMode('normal');
	}

	if(!pg.stylebar.getFillColor() && !pg.stylebar.getStrokeColor()) {
		pg.stylebar.setFillColor('rgb(0,0,0)');
	}
	
	pg.stylebar.setStrokeColor('rgba(0,0,0,0)');
	pg.stylebar.setStrokeWidth(0);

};