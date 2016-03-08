// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
"use strict";
function log( obj, msg ) {
    console.log(obj);
    console.log("^ " + msg);
}

class Project {
    constructor( projectId, projectName ) {
        this.id = projectId;
        this.projectName = projectName;
        this.images = [];
    }
    
}

angular.module('cameraApp', ['ionic', 'ngCordova'])

	.run(function($ionicPlatform) {
		$ionicPlatform.ready(function() {
			if (window.cordova && window.cordova.plugins.Keyboard) {
				// Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
				// for form inputs)
				cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

				// Don't remove this line unless you know what you are doing. It stops the viewport
				// from snapping when text inputs are focused. Ionic handles this internally for
				// a much nicer keyboard experience.
				cordova.plugins.Keyboard.disableScroll(true);
			}
			if (window.StatusBar) {
				window.StatusBar.styleDefault();
			}
		});
	})

	.config(function($stateProvider, $urlRouterProvider, $ionicConfigProvider) {
		$stateProvider
			.state('mainView', {
				url: '/mainView',
				views: {
					mainView: {
						templateUrl: 'main_view.html'
					}
				}
			})
            
            .state('projectBrowser', {
                url: '/projectBrowser',
                views: {
                    'projectBrowser': {
                        templateUrl: 'project_browser.html'
                    }
                }
            })
            
			.state('imageBrowser', {
				url: '/imageBrowser',
				views: {
					imageBrowser: {
						templateUrl: 'image_browser.html'
					}
				}
			})

			.state('settings', {
				url: '/settings',
				views: {
					settings: {
						templateUrl: 'settings.html'
					}
				}
			})

		$urlRouterProvider.otherwise('/mainView');
	})

	.controller('settingsCtrl', function($scope, localStorage, FileManipulationService, PHPUploadService, $ionicPlatform, $cordovaDialogs) {
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
			/*
			var directory;
			FileManipulationService.listDirectory( dataStorageUri ).then(function ( entriesArray ) {
				directory = entriesArray;
				angular.forEach( directory, function(photo, key) {
					if(photo.isFile) {
						 window.resolveLocalFileSystemURL( dataStorageUri,
							function (fileSystem) {
								fileSystem.getFile( photo.name , { create:false }, function(file) {
									file.remove(function() {
										$cordovaDialogs.alert("Usunięto!");
									}, rejectError);
								}, rejectError);
						}, rejectError)
					}
				});
			}, rejectError);
			*/
		}

		$scope.getPhotos = function() {
			var ftpSettings = localStorage.getConfigurationData();
			if (ftpSettings != "") {
				PHPUploadService.handshake(ftpSettings).then(function(handshake) {
					if (handshake.data.isFTPGood) {
						if (handshake.data.isSRVGood) {
							FileManipulationService.getPhotos(dataStorageUri).then(function(photos) {
								var imagesSent = 0;
								for (var i = 0; i < photos.length; i++) {
									PHPUploadService.uploadFile(photos[i], handshake.data.token).then(function(resolve) {
										var json = JSON.parse(resolve.response);
										if (json.isGood) imagesSent++;
										if (imagesSent == photos.length) {
											PHPUploadService.requestFTPupload(handshake.data.token).then(informGood, rejectError);
										}
									}, rejectError);
								}
							});
						} else rejectError();
					} else rejectError();
				}, rejectError);
			}
		}

	})

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
	}])

	.controller('mainCtrl', function($q, $scope, $ionicPlatform, localStorage, $interval, $ionicModal, $cordovaToast, $state, $cordovaDialogs, $cordovaFileTransfer, FileManipulationService, PHPUploadService) {

		$scope.projects = [];
		$scope.state = $state;
		$scope.cameraInitialized = false;
		$scope.menuOpened = false; //Controls menu
		$scope.params = { pictures: 6, pictureInterval: 8, time: '5s' }; /* pictures - holds picture count from model | pictureInterval - holds interval beetween pictures in seconds */

		var pictureLoop = { loop: undefined, counter: undefined, timer: undefined, timerCounter: undefined };
		var dataStorageUri = undefined;
		$ionicPlatform.ready(function() {
			dataStorageUri = cordova.file.dataDirectory;
			updateGallery();

			if (!$scope.cameraInitialized) {
				$scope.cameraInitialized = true;

				var options = { x: 0, y: 0, width: screen.width, height: screen.height };
				//Options, default camera, tapToTakePicture, DragEnabled, SendToBack
				cordova.plugins.camerapreview.startCamera(options, "back", false, false, true);

				/* Camera resolution fix */
				setTimeout(function() {
					cordova.plugins.camerapreview.switchCamera();
					cordova.plugins.camerapreview.switchCamera();
				}, 1000);
			}
		});

		$ionicModal.fromTemplateUrl('image_preview.html', {
			scope: $scope,
			animation: 'slide-in-down'
		}).then(function(modal) {
			$scope.preview = modal;
		});

		$scope.openPreview = function(directoryName, pictureURL) {
			$scope.preview.show();
			$scope.preview.dirName = directoryName;
			$scope.preview.pictureURL = pictureURL;
		}

		$scope.closePreview = function() {
			$scope.preview.hide();
		}

		$scope.toggleMenu = function() {
			if (!$scope.menuOpened)
				$scope.menuOpened = true;
			else
				$scope.menuOpened = false;
		}

		$scope.cameraShow = function() {
			$ionicPlatform.ready(function() {
				cordova.plugins.camerapreview.show();
			});
		}

		$scope.cameraHide = function() {
			$ionicPlatform.ready(function() {
				cordova.plugins.camerapreview.hide();
			});
		}

		/* var even = true;
		 $scope.takePicture = function() {
		 	if (pictureLoop.loop === undefined) {
				pictureLoop.counter = 0;
				pictureLoop.timerCounter = 0;
				pictureLoop.loop = $interval(function() {
					if (even) {
						even = false;
						$cordovaToast.showShortCenter($scope.params.pictureInterval - pictureLoop.timerCounter + "s");
					} else even = true;
					pictureLoop.timerCounter++;
					if (pictureLoop.timerCounter >= $scope.params.pictureInterval) {
						pictureLoop.timerCounter = 0;
						if (pictureLoop.counter < $scope.params.pictures) {
							takePictureUtility();
							pictureLoop.counter += 1;
						} else cleanLoopVariables();
					}
				}, 1000);
			}
		 }*/
        
        /**
         * Working on it to merge it with up
         */
		$scope.takePictureUtility = function() {
			$cordovaDialogs.prompt("Wprowadź nazwę projektu", "Projekt", ["Start", "Anuluj"], "").then(function( projectPrompt ) {
				log(projectPrompt, "prompt");
                if( projectPrompt.buttonIndex == 2 ) return;
                var project = new Project( $scope.projects.length + 1, projectPrompt.input1 );
                $scope.projects.push( project );
                takePictureUtility( project.id );
			});

		}

		var takePictureUtility = function( projectId ) {
			cordova.plugins.camerapreview.takePicture();
			cordova.plugins.camerapreview.setOnPictureTakenHandler(
				function( result ) {
                    log(projectId,'elo');
                    for( var i = 0; i < $scope.projects.length; i++ ) {
                        if( $scope.projects[i].id == projectId ) {
                            log($scope.projects[i], "to ten jedyny!");
                            $scope.projects[i].images.push( result[0] );
                            FileManipulationService.saveProjects( dataStorageUri, $scope.projects ).then( log, log );
                        }
                    }
					log(result, "result");
				}
			);
		}

		var updateGallery = function() {
			FileManipulationService.getProjects( dataStorageUri ).then( setConfig, log );
            function setConfig( config ) {
                $scope.projects = config;
            }
		}

		var cleanLoopVariables = function() {
			$interval.cancel(pictureLoop.loop);
			pictureLoop.loop = undefined;
			pictureLoop.counter = undefined;
			pictureLoop.timer = undefined;
			pictureLoop.timerCounter = undefined;
		}

		$scope.$watch('state.current.name', function() {
            log($scope, $scope.state.current.name);
			if ($scope.state.current.name == 'imageBrowser') updateGallery();
			if ($scope.state.current.name != 'mainView') $scope.cameraHide();
			else $scope.cameraShow();
		});

	})
    
	.service('FileManipulationService', ['$q', function($q) {
		/**
		 * Zwraca w resolve zawartość katalogu w tablicy.
		 * Jeśli nie znaleziono ściezki wywoła reject z błędem.
		 * @param {string} path - Ściezka do katalogu
		 * @returns {[]} - Zwraca tablicę z obiektami
		 */
		function listDirectory( path ) {
            var deferred = $q.defer();
            
			function rejectError(err) {
				deferred.reject(err);
			}
            
            var dirEntries = [];
            window.resolveLocalFileSystemURL(path, function(fileSystem) {
                var reader = fileSystem.createReader();
                reader.readEntries(function(entries) {
                    for (var i = 0; i < entries.length; i++) {
                        dirEntries.push(entries[i]);
                    }
                    deferred.resolve(dirEntries);
                },
                rejectError);
            }, rejectError);

            return deferred.promise;
		}
		/**
         * Zwraca czy plik jest zdjęciem
		 * @param  {string} fileName
		 */
		function isJPEG(fileName) {
			if (fileName.indexOf('.jpg') > -1) return true;
			return;
		}
        /**
         * Zwraca czy entry jest katalogiem
         * @param {string} entrypoint
         */
		function isDir(entrypoint) {
			if ( entrypoint.isDirectory ) return true;
			return;
		}
		/**
		 * Zwraca w resolve czy katalog jest pusty.
		 * Jeśli nie odnaleziono katalogu, reject.
		 * @param {string} entrypoint - Ścieżka do katalogu
		 */
		function isDirEmpty( entrypoint ) {
			var deferred = $q.defer();
			listDirectory( entrypoint ).then(function( fileList ) {
				if( fileList.length == 0) deferred.resolve(true);
				deferred.resolve(false);
			}, function( error ) {
				deferred.reject( error );
			});
			return deferred.promise;
		}
        /**
         * ###Stwórz katalog z losową nazwą w głównym katalogu i umieść w nim plik konfiguracyjny projektu
         * ####deferred
         * dataURI - ścieżka do głównego katalogu
         * 
         * Zwraca ścieżkę do nowego katalogu w resolve
         * 
         * lub error w reject
         * @param {string} dataURI
         */
		function createDirectory( dataURI ) {
            var deferred = $q.defer();
            /**
             * Zwraca losowy znak z tablicy
             */
			function getRandomChar() {
				var possibleChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
				var pos = Math.round(Math.random() * possibleChars.length);
				return possibleChars.charAt(pos);
			}
            /**
             * Zwraca losowego stringa o długości
             * @param {number} length
             */
			function getRandomString( length ) {
				var dirName = "";
				for (var i = 0; i <= length; i++) {
					dirName += getRandomChar();
				}
				return dirName;
			}
            
			var dirName = getRandomString(10);
			log(dirName, "new dir name");
			window.resolveLocalFileSystemURL(dataURI, function(rootFS) {
				log(rootFS, "main dir");
				rootFS.getDirectory(dirName, { create: true, exclusive: false }, onGetDirectorySuccess, onGetDirectoryFail);
                function onGetDirectorySuccess(result) {
                    deferred.resolve( result.nativeURL );
				}
                
                function onGetDirectoryFail( fail ) {
                    deferred.reject(fail);
                    log(fail, 'fail');
                }
			});
            return deferred.promise;
		}
		/**
		 * ###Zapisuje plik as-is
         * 
         * ####deferred
         * 
         * dataURI - ściezka do katalogu
         * 
         * fileName - nazwa pliku
         * 
         * data - dane do zapisania
         * 
		 * @param {string} dataURI
		 * @param {string} fileName
		 * @param {string} data
		 */
		
		function saveFile(dataURI, fileName, data) {
			var deferred = $q.defer();
			window.resolveLocalFileSystemURL(dataURI, function(dirEntry) {
				dirEntry.getFile(fileName, { create: true }, function(fileEntry) {
					fileEntry.createWriter(function(fileWriter) {
						fileWriter.onwriteend = function(result) {
							deferred.resolve(result);
						}
						fileWriter.onerror = function(err) {
							deferred.reject(err);
						}

						fileWriter.write(data);
					});
				});
			});
			return deferred.promise;
		}
        /**
         * Odczytuje plik z lokalizacji za pomocą jednego z trzech trybów
         * 
         * getAs - text | binary | dataurl
         * @param {string} getAs
         * @param {string} fileName
         * @param {string} dataURI
         * TEXT, BINARY, DATAURL
         */
        function getFile( dataURI, fileName, getAs ) {
            var deferred = $q.defer();
			window.resolveLocalFileSystemURL(dataURI + fileName, function(fileEntry) {
				//fileEntry.file returns File obj connected to selected file
				fileEntry.file(function(file) {
					var reader = new FileReader();
					reader.onloadend = function(e) {
						deferred.resolve(e.target.result);
					}
                    switch( getAs.toUpperCase() ) {
                        case "DATAURL": 
                            reader.readAsDataURL( file );
                            break;
                        case "BINARY":
                            reader.readAsBinaryString( file );
                            break;
                        default:
                        case "TEXT":
                            reader.readAsText( file );
                            break;
                    }
				});
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
        }
        /** 
         * To complete
         */
        function saveProjects( dataURI, config ) {
            var deferred = $q.defer();
            var data = angular.toJson( config );
            saveFile( dataURI, 'main.json', data ).then(success, fail);

            function success( resolve ) {
                log(resolve, "success");
                deferred.resolve( { saved: true } );
            }
            function fail( err ) {
                log(err, "error");
                deferred.reject( { saved: false } );
            }

            return deferred.promise;
        }
        /**
         * 
         */
        function getProjects( dataURI ) {
            var deferred = $q.defer();
            getFile( dataURI, 'main.json', "text" ).then( parseJson, createAndRepeat );

            function parseJson( jsonText ) {
                log(jsonText, "json");
                var obj = angular.fromJson( jsonText );
                deferred.resolve( obj );
            }

            function throwError( err ) {
                deferred.reject( err );
                log(err, "error reading file");
            }

            function createAndRepeat( err ) {
                saveFile( dataURI, 'main.json', "[]" ).then( function( result ) {
                    getFile( dataURI, 'main.json', "text" ).then( parseJson, throwError );
                }, throwError );
            }
            
            return deferred.promise;
        }
        /* --- NOWE FUNCKJE ---  */
        /**
         * Dostępny z zewnątrz handler do createDirectory
         * @param {string} dataURI
         */
		this.createDirectory = function( dataURI ) {
			return createDirectory(dataURI);
		}
        this.getFile = function( dataURI, fileName, getAs ) {
            return getFile( dataURI, fileName, getAs );
        }
        this.saveProjects = function( dataURI, config ) {
            return saveProjects( dataURI, config );
        }
        this.saveFile = function(dataURI, fileName, data) {
			saveFile(dataURI, fileName, data);
		}
        this.getProjects = function( dataURI ) {
            return getProjects( dataURI );
        }

        /* --- DO POPRAWY --- */

		/*
		this.getPhotos = function ( dataURI ) {
			var deferred = $q.defer();
			this.listDirectory( dataURI ).then( function( entriesArray ) {
				var filesLoaded = 0; 
				var photosCount = 0;
				var images = [];
				angular.forEach( entriesArray, function( photo, key ) {
					console.log( 'Key: ' + key );
					console.log( 'Photo: ' + JSON.stringify(photo) );
					if( photo.isFile && isJPEG( photo.name ) ) {
						photosCount++;
						getPhotoDataURL( dataURI, photo.name ).then( function( result ) {
							console.log( 'Loaded' );
							images.push( { name: photo.name, url: photo.nativeURL } )
							filesLoaded++;
							if( filesLoaded == photosCount ) {
								console.log('All files loaded!');
								deferred.resolve( images );
							}
						}, function ( err ) {
							deferred.reject( err );
						});
				  }  
				});
			});
			return deferred.promise;
		}*/
	}])

	.service('PHPUploadService', ['$q', '$cordovaFileTransfer', 'FileManipulationService', '$http', function($q, $cordovaFileTransfer, FileManipulationService, $http) {

		var serverURL = 'http://modus360.qbiz.pl/upload.php';
		var handshakeURL = 'https://modus360.qbiz.pl/handshake.php';
		var requestFTPURL = 'https://modus360.qbiz.pl/requestftp.php';
		this.uploadFile = function(fileURL, token) {
			var deferred = $q.defer();
			var options = {
				fileKey: "file",
				fileName: fileURL.name,
				chunkedMode: true,
				params: { srvToken: token },
				mimeType: "image/jpeg;base64,",
			};
			$cordovaFileTransfer.upload(serverURL, fileURL.url, options).then(function(result) {
				deferred.resolve(result);
			}, function(err) {
				deferred.reject(err);
			});
			return deferred.promise;
		}

		this.handshake = function(ftpConfig) {
			var deferred = $q.defer();
			$http.post(handshakeURL, ftpConfig).then(PHPCallback, POSTError);

			function PHPCallback(callback) {
				console.log(callback);
				deferred.resolve(callback);
			}

			function POSTError(error) {
				console.error(error);
				deferred.reject(error);
			}
			return deferred.promise;
		}

		this.requestFTPupload = function(token) {
			var deferred = $q.defer();
			$http.post(requestFTPURL, { srvToken: token }).then(FTPCallback, POSTError);

			function FTPCallback(callback) {
				if (callback.data.uploadCompleted && !callback.data.uploadErr.length) {
					deferred.resolve(callback.data.uploadCompleted);
				} else {
					console.log(callback.data.uploadErr);
					deferred.reject({ uploadCompleted: false, uploadErrors: callback.data.uploadErr });
				}
			}

			function POSTError(error) {
				deferred.reject(error);
			}
			return deferred.promise;
		}
	}]);