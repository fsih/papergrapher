
pg.order = function() {
	

	var bringSelectionToFront = function() {
		pg.undo.snapshot('bringSelectionToFront');
		var items = pg.selection.getSelectedItems();
		for(var i=0; i < items.length; i++) {
			items[i].bringToFront();
		}
	};

	var sendSelectionToBack = function() {
		pg.undo.snapshot('sendSelectionToBack');
		var items = pg.selection.getSelectedItems();
		for(var i=items.length - 1; i >= 0; i--) {
			items[i].sendToBack();
		}
	};

	var bringForward = function() {
		var items = pg.selection.getSelectedItems();
		// Already at front
		if (items.length === 0 || !items[items.length - 1].nextSibling) {
			return;
		}

		pg.undo.snapshot('bringForward');
		var nextSibling = items[items.length - 1].nextSibling;
		for(var i=items.length - 1; i >= 0; i--) {
			items[i].insertAbove(nextSibling);
		}
	};

	var sendBackward = function() {
		var items = pg.selection.getSelectedItems();
		// Already at front
		if (items.length === 0 || !items[0].previousSibling) {
			return;
		}

		pg.undo.snapshot('sendBackward');
		var previousSibling = items[0].previousSibling;
		for(var i=0; i < items.length; i++) {
			items[i].insertBelow(previousSibling);
		}
	};
	
	var shouldShowSendBackward = function() {
		var items = pg.selection.getSelectedItems();
		if (items.length === 0 || !items[0].previousSibling) {
			return false;
		}
		return true;
	};

	var shouldShowBringForward = function() {
		var items = pg.selection.getSelectedItems();
		if (items.length === 0 || !items[items.length - 1].nextSibling) {
			return false;
		}
		return true;
	};
	
	return {
		bringSelectionToFront:bringSelectionToFront,
		sendSelectionToBack:sendSelectionToBack,
		bringForward:bringForward,
		sendBackward: sendBackward,
		shouldShowBringForward:shouldShowBringForward,
		shouldShowSendBackward:shouldShowSendBackward
	};
	
}();