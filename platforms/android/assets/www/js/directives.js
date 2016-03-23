angular.module('cameraApp.directives', [])
    .directive('grid', function() {
		return {
			templateUrl: 'grid.html'
		}
	})
	
	.directive('cameraConfiguration', function() {
		return {
			templateUrl: 'main-view-camera-config.html'
		}
	})
	
	.directive('camera', function() {
		return {
			templateUrl: 'camera.html'
		}
	})
    
    .directive('menuTabs', function() {
        return {
            templateUrl: 'menu-tabs.html'
        }
    })
    
    .directive('shutterActivation', function() {
       return {
           templateUrl: 'main-view-shutter-config.html'
       } 
    });