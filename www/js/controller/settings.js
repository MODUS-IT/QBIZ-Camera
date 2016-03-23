angular.module('cameraApp.settingsCtrl', []).controller('settingsCtrl', function($scope, localStorage, FileManipulationService, PHPUploadService, $ionicPlatform, $cordovaDialogs) {
		//FTP Config Data
		$scope.ftp = {};
		var dataStorageUri;

		$ionicPlatform.ready(function() {
			dataStorageUri = cordova.file.dataDirectory;
		});

		$scope.readConfigurationData = function() {
			var configurationData = localStorage.getConfigurationData();
			$scope.ftp.server = configurationData.server;
			$scope.ftp.user = configurationData.user;
			$scope.ftp.password = configurationData.password;
		}

		$scope.saveConfigurationData = function() {
			localStorage.saveConfigurationData($scope.ftp);
		}

		var rejectError = function() {
			navigator.notification.alert("Wystąpił błąd. Spróbuj jeszcze raz.");
		}

		var informGood = function() {
			navigator.notification.alert("Zdjęcia zostały wysłane! Kliknij Usuń wszystkie, aby wyczyścić pamięć urządzenia");
		}

		$scope.purgeDir = function() {
			FileManipulationService.purgeProjects( dataStorageUri ).then( log, log );
		}
		
		$scope.sendPhotos = function() {
			var UID = PHPUploadService.beginTransaction();
			if( UID ) {
				PHPUploadService.uploadInitialData( UID, $scope.ftp ).then( canProceed, canProceed );
				function canProceed( promise ) {
					if( promise ) FileManipulationService.getProjects( dataStorageUri ).then( uploadConfig, log );
					else $cordovaToast.showShortTop('Nie powiodło się');
					function uploadConfig( config ) {
						$scope.config = config;
						PHPUploadService.uploadConfig( UID, config ).then( uploadPhotos, log );
						function uploadPhotos( callback ) {
							var imagesCount = 0;
							var uploadedImages = 0;
							if( callback.data.bool ) {
								for( var i = 0; i < $scope.config.length; i++ ) {
									for( var img = 0; img < $scope.config[i].images.length; img++ ) {
										imagesCount++;
										PHPUploadService.uploadPhoto( UID, $scope.config[i].images[img] ).then( function( callback ) {
											log(callback , "uploaded");
											uploadedImages++;
											if( imagesCount == uploadedImages ) {
												console.log("All uploaded");
												PHPUploadService.cleanUp( UID ).then( uploadImages, log );
												function uploadImages( callback ) {
													if( callback ) {
														PHPUploadService.uploadToHost( UID ).then(log, log);
													}
												}
											}
										}, log );
									}
								}
							}
						}
					}
				}
			}
		}
	})