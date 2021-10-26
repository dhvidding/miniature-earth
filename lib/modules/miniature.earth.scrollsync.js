// ScrollSync v1.0
// Synchronizes a scrollable element with earth locations

window.addEventListener( "earthjsload", function() {

	Earth.ScrollSync = {};
	
	
	var earth, container, elements, activate;
	var start_y, end_y;
	var dragging = false;
	
	var nearest_element;
	var active_marker = null;
	var active_max_distance = 1000;
	
	
	Earth.ScrollSync.enable = function( sync_earth, sync_container, sync_elements, sync_activate ) {

		earth = sync_earth;
		container = sync_container;
		elements = sync_elements;
		activate = sync_activate;
		
		earth.addEventListener( 'dragstart', startDrag );
		earth.addEventListener( 'dragend', endDrag );
		
		getObjectForScrollEvent().addEventListener( 'scroll', syncLocation );
		
		window.addEventListener( 'resize', updateElements );
		
		updateElements();

	};
	
	Earth.ScrollSync.disable = function() {
		
		earth.removeEventListener( 'dragstart', startDrag );
		earth.removeEventListener( 'dragend', endDrag );
		
		getObjectForScrollEvent().removeEventListener( 'scroll', syncLocation );
		
		window.removeEventListener( 'resize', updateElements );
	
	};
	
	
	function startDrag() {
		dragging = true;
		earth.addEventListener( 'change', syncScrollTop );		
	}
	function endDrag() {
		dragging = false;
		earth.removeEventListener( 'change', syncScrollTop );	
	}
	
	
	function syncLocation() {
		
		if ( dragging ) return;
		
		earth.location = scrollTopToLocation();
		
		updateDistances();
		updateActive();
		
	}
	
	function syncScrollTop() {
		
		if ( ! dragging ) return;
		
		updateDistances();
		updateActive();
		
		// within range?
		if ( ! withinRange() ) return;
		
		container.scrollTop = locationToScrollTop();
		
		
	}
	
	function getObjectForScrollEvent() {
		if ( container == document.documentElement ) {
			return window;
		} else {
			return container;
		}
	}
	
	
	function progressFromScrollTop() {
		
		var y = container.scrollTop - start_y + container.clientHeight / 2;
		if ( y < 0 ) y = 0;
		
		var h =	end_y - start_y ;
		if ( h < 0 ) h = 1;
		
		var p = y / h;
		if ( p < 0 ) p = 0;
		if ( p > 1 ) p = 1;
		
		return p;
		
	}
	
	function scrollTopToLocation() {
		
		var p = progressFromScrollTop();
		
		var elem1, elem2;
		
		for ( var i=0; i < elements.length; i++ ) {
			if ( elements[i].p >= p ) {
				if ( i == 0 ) {
					elem1 = elements[i];
					elem2 = elements[i+1];
				} else {
					elem1 = elements[i-1];
					elem2 = elements[i];
				}
				break;
			}
		}
		
		var between_elements = (p - elem1.p) / (elem2.p - elem1.p);
		
		return Earth.lerp( elem1.location, elem2.location, between_elements );
		
	}
	
	
	function locationToScrollTop() {
				
		var elem1 = nearest_element;
		var elem2;

		
		if ( elements[elem1.index+1] && elements[elem1.index-1] ) {
			if ( elements[elem1.index-1].distance < Earth.getDistance( { lat: earth.location.lat, lng: elem1.location.lng }, { lat: earth.location.lat, lng: elements[elem1.index-1].location.lng } ) ) {
				elem2 = elements[elem1.index-1];
			} else {
				elem2 = elements[elem1.index+1];
			}
			
		} else if ( elements[elem1.index+1] ) {
			elem2 = elements[elem1.index+1];
			
		} else {
			elem2 = elements[elem1.index-1];
			
		}
		
		var between_elements = elem1.distance / (elem1.distance + elem2.distance);
		
		return elem1.y * (1-between_elements) + elem2.y * between_elements - container.clientHeight / 2;
		
		
	}
	
	
	
	// dragging between first and last element/marker?
	
	function withinRange() {
		
		var first = elements[0];
		var second = elements[1];
		
		var last = elements[elements.length-1]; 
		var last_but_one = elements[elements.length-2]; 
		
		if ( first.distance < last.distance ) {
			// before first?
			if ( second.distance > Earth.getDistance( { lat: earth.location.lat, lng: first.location.lng }, { lat: earth.location.lat, lng: second.location.lng } ) ) return false;
		
		} else {
			// after last?
			if ( last_but_one.distance > Earth.getDistance( { lat: earth.location.lat, lng: last.location.lng }, { lat: earth.location.lat, lng: last_but_one.location.lng } ) ) return false;
			
		}		
		
		return true;
		
	}
	
	
	// update element positions
	
	function updateElements() {
		
		var container_top = (container.getBoundingClientRect) ? container.getBoundingClientRect().top : 0;
		
		for ( var i=0; i < elements.length; i++ ) {
			var box = elements[i].element.getBoundingClientRect();
			elements[i].index = i;
			elements[i].y = box.top - container_top + box.height/2; // center position in container
			elements[i].p = i / (elements.length-1);
			if ( i == 0 ) start_y = elements[i].y;
			if ( i == elements.length-1 ) end_y = elements[i].y;
		}
		
		syncLocation();
		
	}
	
	
	
	function updateDistances() {

		var lng = earth.location.lng;
		
		var min_distance = 0;
		
		for ( var i=0; i < elements.length; i++ ) {
			elements[i].distance = Earth.getDistance( earth.location, { lat: earth.location.lat, lng: elements[i].location.lng } );
			if ( ! min_distance || elements[i].distance <= min_distance ) {
				nearest_element = elements[i];
				min_distance = elements[i].distance;
			}
		}
	
	}	
	
	
	function updateActive() {
		
		var new_active = null;
		
		var min_distance = 0;
		for ( var i=0; i < elements.length; i++ ) {
			if ( elements[i].distance > active_max_distance ) continue;
			
			if ( ! min_distance || elements[i].distance <= min_distance ) {
				new_active = elements[i];
				min_distance = elements[i].distance;
			}
		}
		
		
		// trigger activate event
		
		if ( new_active != active_marker ) {
			
			if ( activate ) {
				activate( new_active, active_marker );
			}
			
			active_marker = new_active;
		
		}		
		
	}
	

} );