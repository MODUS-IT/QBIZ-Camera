angular.module('cameraApp.localStorage', [])
    .service('localStorage', [function() {
		this.getConfigurationData = function() {
			var configurationData = window.localStorage['FTPconfig'];
			if (configurationData) {
				return angular.fromJson(configurationData);
			}
			return { server: "", user: "", password: "" };
		}

		this.saveConfigurationData = function(configurationData) {
			window.localStorage['FTPconfig'] = angular.toJson(configurationData);
		}
		
		this.saveCameraData = function( params ) {
			window.localStorage['camera'] = angular.toJson(params);
		}
		
		this.getCameraData = function() {
			var cameraData = window.localStorage['camera'];
			if(cameraData) {
				return angular.fromJson(cameraData);
			}
			return { grid: false, pictures: 8, pictureInterval: 30, shutterActivation: "timer" };
		}
		
		this.getUID = function() {
			var UID = window.localStorage['devUID'];
			return UID;
		}
		
		this.saveUID = function( UID ) {
			window.localStorage['devUID'] = UID;
		}
	}]);