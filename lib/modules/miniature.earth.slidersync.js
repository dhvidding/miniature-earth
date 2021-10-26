// SliderSync v1.0
// Synchronizes a slider with earth locations

window.addEventListener( "earthjsload", function() {

	Earth.SliderSync = {};
	
	
	var earth, slider, activate;
	var dragging = false;
	var active_slide;
	var slides = [];
	
	
	Earth.SliderSync.enable = function( sync_earth, sync_slider, sync_activate ) {

		earth = sync_earth;
		slider = sync_slider;
		activate = sync_activate;
		
		var index = 0;
		for ( var i=0; i < slider.slides.length; i++ ) {
			if ( slider.slides[i].classList.contains('swiper-slide-duplicate') ) continue;
			slider.slides[i].index = index;
			slides.push( slider.slides[i] );
			index++;
		}
		
		// event slide change
		sync_slider.on( 'slideChange', syncLocationFromSlide );
		
		earth.addEventListener( 'dragstart', startDrag );
		earth.addEventListener( 'dragend', endDrag );
		
		syncLocationFromSlide( true );
		
	};
	
	
	function syncLocationFromSlide( instantly ) {
		
		if ( dragging ) return;
				
		// get active slide
		var slide = slides[ slider.realIndex ];
		if ( instantly ) {
			earth.location = slide.location;
		} else {
			earth.goTo( slide.location );
		}
		
		updateActive( slide );
		
	}
	
	
	
	function startDrag() {
		dragging = true;
		earth.addEventListener( 'change', syncSlideFromLocation );		
	}
	function endDrag() {
		dragging = false;
		earth.removeEventListener( 'change', syncSlideFromLocation );	
	}

	
	function syncSlideFromLocation() {
		
		if ( ! dragging ) return;

		var min_distance = 0;
		var new_slide;
		
		// find nearest
		
		for ( var i=0; i < slides.length; i++ ) {
			slides[i].distance = Earth.getDistance( earth.location, slides[i].location );
			if ( ! min_distance || slides[i].distance <= min_distance ) {
				new_slide = slides[i];
				min_distance = new_slide.distance;
			}
		}
		
		if ( ! active_slide || new_slide.index != active_slide.index ) {
			slider.slideToLoop( new_slide.index, 400, false );
			updateActive( new_slide );
		}
	
	}	
	
	
	function updateActive( new_slide ) {		
		
		// trigger activate event
		
		if ( ! active_slide || new_slide.index != active_slide.index ) {
			
			if ( activate ) {
				activate( new_slide, active_slide );
			}
			
			active_slide = new_slide;
		
		}		
		
	}
	

} );