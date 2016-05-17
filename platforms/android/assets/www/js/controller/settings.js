angular.module('cameraApp.settingsCtrl', []).controller('settingsCtrl', function($scope, localStorage, FileManipulationService, PHPUploadService, $ionicPlatform, $cordovaDialogs) {
		/*---------------------------------------ACTIONS-------------------------------------------------------------------------------------------------------------*/
        $scope.readConfigurationData = readConfigurationData;
        $scope.saveConfigurationData = saveConfigurationData;
        $scope.deleteAllProjects = deleteAllProjects;
        $scope.uploadAllProjects = uploadAllProjects;
        /*----------------------------------------VARS----------------------------------------------------------------------------------------------------------------*/
        $scope.ftp = {};
        var dataStorageUri;
        /*----------------------------------------FUNCTIONS-----------------------------------------------------------------------------------------------------------*/
		$ionicPlatform.ready(function() {
			dataStorageUri = cordova.file.dataDirectory;
		});

		function readConfigurationData() {
			var configurationData = localStorage.getConfigurationData();
			$scope.ftp.server = configurationData.server;
			$scope.ftp.user = configurationData.user;
			$scope.ftp.password = configurationData.password;
		}

		function saveConfigurationData() {
			localStorage.saveConfigurationData($scope.ftp);
		}

		var rejectError = function( err ) {
            log(err, "fKin error");
            var errStr;
            switch( err.errc ) {
                case 1: errStr = "Nie rozpoznano nazwy hosta."; break;
                case 2: errStr = "Niepoprawne dane logowania."; break;
                case 3: errStr = "Błąd zapisu danych. Spróbuj ponownie później."; break;
                case 4: errStr = "Błędne ID. Spróbuj ponownie później."; break;
            }
			$cordovaDialogs.alert("Wystąpił błąd. " + errStr , "Wysyłanie", "OK");
		}

		var informGood = function() {
			$cordovaDialogs.alert("Zdjęcia zostały wysłane! Kliknij Usuń wszystkie, aby wyczyścić pamięć urządzenia", "Wysyłanie", "OK");
		}

		function deleteAllProjects() {
			FileManipulationService.purgeProjects( dataStorageUri ).then( log, log );
		}
		
		function uploadAllProjects() {
		    var UID = PHPUploadService.beginTransaction();
		    if (UID) {
		        PHPUploadService.uploadInitialData(UID, $scope.ftp)
                .then(function ( promise ) {
                    if (promise.bool) return FileManipulationService.getProjects(dataStorageUri);
                    else rejectError(promise);
                })
                .then(function ( config ) {
                    $scope.config = config;
                    return PHPUploadService.uploadConfig(UID, config);
                })
		        .then(function ( callback ) {
		            if (callback.data.bool) {
		                for (var i = 0; i < $scope.config.length; i++) {
		                    var uploads = [];
		                    for (var img = 0; img < $scope.config[i].images.length; img++) {
		                        uploads.push(PHPUploadService.uploadPhoto(UID, $scope.config[i].images[img]));
		                    }
		                    return Promise.all(uploads);
		                }
		            }
		        }, rejectError)
                .then(function () {
                    return PHPUploadService.cleanUp(UID);
                })
		        .then(function ( callback ) {
		            if (callback) {
		                return PHPUploadService.uploadToHost(UID);
		            }
		        })
		        .then(informGood)
                .catch(rejectError);
		    }

			/*if( UID ) {
				PHPUploadService.uploadInitialData( UID, $scope.ftp ).then( canProceed, canProceed );
				function canProceed( promise ) {
					if( promise.bool ) FileManipulationService.getProjects( dataStorageUri ).then( uploadConfig, rejectError );
					else rejectError( promise );
					function uploadConfig( config ) {
						$scope.config = config;
						PHPUploadService.uploadConfig( UID, config ).then( uploadPhotos, rejectError );
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
												PHPUploadService.cleanUp( UID ).then( uploadImages, rejectError );
												function uploadImages( callback ) {
													if( callback ) {
														PHPUploadService.uploadToHost( UID ).then( informGood, rejectError );
													}
												}
											}
										}, rejectError );
									}
								}
							}
						}
					}
				}
			}*/
		} 
	})