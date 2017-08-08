pg.statusbar = function() {
	
	var setup = function() {
		setupZoomSelect();
	};
	
	
	var setupZoomSelect = function() {
		jQuery('#zoomSelect').change(function(event) {
			zoom(event.currentTarget.value);
		});
		// todo update
		jQuery('#zoomInput').on('input', function (event) {
			zoom(event.currentTarget.value / 100);
		});
	};
	
	var zoom = function (scale) {
		if (scale == 0 || isNaN(scale)) {
			return;
		}
		if (scale > 30) {
			scale = 30;
		}
		var verticalScrollPercent = .5;
		var horizontalScrollPercent = .5;
		if ($('#paperCanvas').height() > $('#canvasContainer').height()) {
			var verticalScrollPercent = ($('#canvasContainer').scrollTop() + $('#canvasContainer').height()/2) / paper.view.viewSize.height;
			var horizontalScrollPercent = ($('#canvasContainer').scrollLeft() + $('#canvasContainer').width()/2) / paper.view.viewSize.width;
		}

		// change paper size
		$(paper.view.element).css("width", 500 * scale + "px");
		$(paper.view.element).css("height", 400 * scale + "px");
		paper.view.viewSize.width = 500 * scale;
		paper.view.viewSize.height = 400 * scale;
		paper.view.zoom = scale;
		paper.view.center = new paper.Point(0, 0);
		if (scale <= 1) {
			$('#canvasContainer').css("overflow", "visible"); // Don't show scroll bars
			$('#paperCanvas').css("position", "absolute"); // center in scroll container
		} else {
			$('#canvasContainer').css("overflow", "auto"); // Show scroll bars
			$('#paperCanvas').css("position", "relative"); // 0,0 matches scroll container's 0,0
		}

		$('#canvasContainer').scrollTop(paper.view.viewSize.height * verticalScrollPercent - $('#canvasContainer').height()/2);
		$('#canvasContainer').scrollLeft(paper.view.viewSize.width * horizontalScrollPercent - $('#canvasContainer').width()/2);

		update();
		this.blur();
	}
	var update = function() {
		jQuery('#zoomInput').val(Math.round(paper.view.zoom*100));
		jQuery('#zoomSelect').val(paper.view.zoom);
		
		var selectionType = pg.selection.getSelectionType();
		if(selectionType) {
			jQuery('#selectionTypeLabel').html(selectionType).removeClass('none');
		} else {
			jQuery('#selectionTypeLabel').html('No selection').addClass('none');
		}
	};

	
	return {
		setup: setup,
		update: update
	};
	
}();