"use strict";

function log( obj, msg ) {
	console.log(obj);
	console.log("^ " + msg);
}
/**
 * @param {number} projectId
 * @param {string} projectName
 */
class Project {
	constructor( projectId, projectName ) {
		this.id = projectId;
		this.projectName = projectName;
		this.images = [];
	}
}

function closeApp() {
	navigator.app.exitApp();
}

angular.module('cameraApp', ['ionic', 'ngCordova'])
	.run(function($ionicPlatform, $state) {
		$ionicPlatform.ready(function() {
			$ionicPlatform.registerBackButtonAction(function() {
			switch( $state.current.name ) {
				case "browser.imageBrowser": 
					$state.go('^.projectBrowser');
					break;
				case "browser.projectBrowser":
					$state.go('mainView');
					break;
				case "settings":
					$state.go('mainView');
					break;
				case "mainView":
					closeApp();
					break;
			}
		}, 101);
			
			window.screen.lockOrientation('portrait');
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
	
	.directive('grid', function() {
		return {
			templateUrl: 'grid.html'
		}
	})
	
	.directive('settings', function() {
		return {
			templateUrl: 'main_view_right.html'
		}
	})
	
	.directive('camera', function() {
		return {
			templateUrl: 'camera.html'
		}
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
			
			.state('browser', {
				url: '/browser',
				views: {
					"mainView": {
						templateUrl: 'browser/browser.html'
					}
				}
			})
			
			.state('browser.projectBrowser', {
				url: '/projectBrowser',
				views: {
					"browser": {
						templateUrl: 'browser/projects.html'
					}
				}
			})
			
			.state('browser.imageBrowser', {
				url: '/imageBrowser',
				views: {
					"browser": {
						templateUrl: 'browser/images.html'
					}
				}
			})

			.state('settings', {
				url: '/settings',
				views: {
					mainView: {
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

	.controller('mainCtrl', function($q, $scope, $ionicPlatform, localStorage, $ionicGesture, $interval, $cordovaNativeAudio, $timeout, $ionicModal, $cordovaToast, $state, $cordovaDialogs, $cordovaFileTransfer, FileManipulationService, PHPUploadService) {
		$scope.swipeRight = viewGoForward;							//App swipe right view
		$scope.swipeLeft = viewGoBack;								//App swipe left view
		$scope.selectProject = selectProject;						//Gallery select project
		$scope.cameraShow = showCamera;								//Show camera preview
		$scope.cameraHide = hideCamera;								//Hide camera preview
		$scope.toggleRightMenu = toggleRightMenu;					//Toggle shooter settings on mainView
		$scope.takePicture = takePicture;							//Init taking pictures
		$scope.openPreview = openPreview;							//Open image preview
		$scope.projects = [];										//Projects array
		$scope.state = $state;										//Connect state to scope
		$scope.isTakingPictures = false;							//As expected
		$scope.rightMenu = false;           						//Controls menu
		$scope.params = {
			grid: undefined,                						//Show grid
			pictures: undefined,            						//No of pics
			pictureInterval: undefined     							//Interval between pics in secs
		};
		$scope.onScreenTimer = $scope.params.pictureInterval;		//Set on screen timer
		var pictureLoop = { 
			loop: undefined, 										//main 1s loop
			counter: undefined, 									//number of pictures taken
			timer: undefined, 										//image take interval
			timerCounter: undefined 								//counter for timer interval
		};
		var dataStorageUri;											//shortcut for storage
		var cameraInitialized = false;								//checked for camera init
		
		$ionicPlatform.ready(function() {
			dataStorageUri = cordova.file.dataDirectory;
			$scope.params = localStorage.getCameraData();
			watchCameraData();
			watchViews();
			updateGallery();
			initCamera();
			initModal();
		});
		
		function initModal() {
			$ionicModal.fromTemplateUrl('image_preview.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				$scope.imagePreview = modal;
			});
		}

		function watchCameraData() {
			$scope.$watch('params.grid', function() {
				localStorage.saveCameraData( $scope.params );
			});
			$scope.$watch('params.pictures', function() {
				localStorage.saveCameraData( $scope.params );
			});
			$scope.$watch('params.pictureInterval', function() {
				$scope.onScreenTimer = $scope.params.pictureInterval;
				localStorage.saveCameraData( $scope.params );
			});
		}
		
		function watchViews() {
			$scope.$watch('state.current.name', function() {
				if ($scope.state.current.name == 'browser.projectBrowser') updateGallery();
				if ($scope.state.current.name == 'mainView') showCamera();
			});
		}

		function openPreview(directoryName, pictureURL) {
			$scope.imagePreview.show();
			$scope.imagePreview.dirName = directoryName;
			$scope.imagePreview.pictureURL = pictureURL;
			FileManipulationService.getFile( dataStorageUri, pictureURL );
		}

		function toggleRightMenu() {
			if( $scope.rightMenu ) $scope.rightMenu = false;
			else $scope.rightMenu = true;
		}

		function viewGoForward() {
			if($scope.isTakingPictures) return;
			switch( $state.current.name ) {
				case "browser.imageBrowser": 
					$state.go('mainView');
					break;
				case "browser.projectBrowser":
					$state.go('mainView');
					break;
				case "settings":
					$state.go('browser.projectBrowser');
					break;
				case "mainView":
					$state.go('settings');
					$timeout($scope.cameraHide, 350);
					break;
			}
		}

		function viewGoBack() {
			if($scope.isTakingPictures) return;
			switch( $state.current.name ) {
				case "browser.imageBrowser": 
					$state.go('settings');
					break;
				case "browser.projectBrowser":
					$state.go('settings');
					break;
				case "settings":
					$state.go('mainView');
					break;
				case "mainView":
					$state.go('browser.projectBrowser');
					$timeout($scope.cameraHide, 350);
					break;
			}
		}
		
		function selectProject( project ) {
			$scope.project = project;
			$state.go('^.imageBrowser');
		}

		function updateGallery() {
			FileManipulationService.getProjects( dataStorageUri ).then( setConfig, log );
			function setConfig( config ) {
				$scope.projects = config;
			}
		}
		
		/* camera */
		function showCamera() {
			$ionicPlatform.ready(function(){ 
				cordova.plugins.camerapreview.show();
			});
		}

		function hideCamera() {
			$ionicPlatform.ready(function() {
				cordova.plugins.camerapreview.hide();
			});
		}
		
		function initCamera() {
			if(cameraInitialized) return;
			cameraInitialized = true;
			var options = { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
			//Options, default camera, tapToTakePicture, DragEnabled, SendToBack
			cordova.plugins.camerapreview.startCamera(options, "back", false, false, true);
			setTimeout( function() { cordova.plugins.camerapreview.fullRes(); }, 1000);
		}

		function takePicture() {
			$cordovaDialogs.prompt("Wprowadź nazwę projektu", "Projekt", ["Start", "Anuluj"], "").then( startOrDecline );
			function startOrDecline( projectPrompt ) {
				//Clicked cancel
				if( projectPrompt.buttonIndex != 1 ) return;
				//Carry on going
				window.project = new Project( $scope.projects.length + 1, projectPrompt.input1 );
				$scope.projects.push( window.project );
				//Init
				if (pictureLoop.loop === undefined) {
					pictureLoop.counter = 0;
					pictureLoop.timerCounter = 0;
					$scope.isTakingPictures = true;
					pictureLoop.loop = $interval( takePictureUsingTimer, 1000 );
				}
			}
		}

		function takePictureUsingTimer() {
			pictureLoop.timerCounter += 1;
			if ( pictureLoop.timerCounter > $scope.params.pictureInterval ) {
				if( pictureLoop.counter < $scope.params.pictures ) {
					pictureLoop.counter += 1;
					$interval.cancel( pictureLoop.loop );
					takePictureUtility( window.project.id );
				} else cleanLoopVariables();
				pictureLoop.timerCounter = 0;
			}
			$scope.onScreenTimer = ( $scope.params.pictureInterval - pictureLoop.timerCounter );
		}

		function takePictureUtility( projectId ) {
			cordova.plugins.camerapreview.takePicture();
			cordova.plugins.camerapreview.setOnPictureTakenHandler(
				function( result ) {
					for( var i = 0; i < $scope.projects.length; i++ ) {
						if( $scope.projects[i].id == projectId ) {
							$scope.projects[i].images.push( result[0] );
							FileManipulationService.saveProjects( dataStorageUri, $scope.projects ).then( log, log );
						}
					}
					pictureLoop.loop = $interval( takePictureUsingTimer, 1000 );
				}
			);
		}
		
		function cleanLoopVariables() {
			$interval.cancel( pictureLoop.loop );
			pictureLoop.loop = undefined;
			pictureLoop.counter = undefined;
			pictureLoop.timer = undefined;
			pictureLoop.timerCounter = 0;
			$scope.isTakingPictures = false;
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
		
		this.saveCameraData = function( params ) {
			window.localStorage['camera'] = angular.toJson(params);
		}
		
		this.getCameraData = function() {
			var cameraData = window.localStorage['camera'];
			if(cameraData) {
				return angular.fromJson(cameraData);
			}
			return { grid: false, pictures: 8, pictureInterval: 30 };
		}
		
		this.getUID = function() {
			var UID = window.localStorage['devUID'];
			return UID;
		}
		
		this.saveUID = function( UID ) {
			window.localStorage['devUID'] = UID;
		}
	}])
	
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
					log( file, "file" );
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
		 * Zapisuje konfigurację aplikacji
		 * 
		 * config - konfiguracja do zapisania
		 * @param {string} dataURI
		 * @param {Object} config
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
		 * Odczytuje konfigurację aplikacji (projekty)
		 * @param {string} dataURI
		 */
		function getProjects( dataURI ) {
			var deferred = $q.defer();
			getFile( dataURI, 'main.json', "text" ).then( parseJson, createAndRepeat );

			function parseJson( jsonText ) {
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
		/**
		 * Usuwa całą konfigurację i dane aplikacji
		 * @param {string} dataURI
		 */
		function purgeProjects( dataURI ) {
			var deferred = $q.defer();
			var counted = 0;
			listDirectory( dataURI ).then( function( entries ) {
				for( var i = 0; i < entries.length; i++ ) {
					log(entries[i], "entry");
					if( !isDir( entries[i] ) ) {
						entries[i].remove( function( callback ) {
							counted++;
						}, log );
					} else {
						entries[i].removeRecursively( function() {
							counted++;
						}, log );
					}
			
				saveProjects( dataURI, [] ).then( function( scc ) {
					deferred.resolve( { success: true } );
				}, function( err ) {
					deferred.reject( { success: false });
				});
					
				}
			}, log );
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
		/**
		 * 
		 */
		this.getFile = function( dataURI, fileName, getAs ) {
			return getFile( dataURI, fileName, getAs );
		}
		/**
		 * 
		 */
		this.saveProjects = function( dataURI, config ) {
			return saveProjects( dataURI, config );
		}
		/**
		 * 
		 */
		this.saveFile = function(dataURI, fileName, data) {
			saveFile(dataURI, fileName, data);
		}
		/**
		 * 
		 */
		this.getProjects = function( dataURI ) {
			return getProjects( dataURI );
		}
		/**
		 * 
		 */
		this.purgeProjects = function( dataURI ) {
			return purgeProjects( dataURI );
		}
	}])

	.service('PHPUploadService', ['$q', '$cordovaFileTransfer', 'FileManipulationService', '$http', 'localStorage', function($q, $cordovaFileTransfer, FileManipulationService, $http, localStorage) {
		this.beginTransaction = beginTransaction;
		this.uploadInitialData = uploadInitialData;
		this.uploadConfig = uploadConfig;
		this.uploadPhoto = uploadPhoto;
		this.cleanUp = cleanUp;
		this.uploadToHost = uploadToHost;
		
		/* STEP 1 */
		
		/**
		 * Sprawdza czy aplikacja posiada UID w local storage
		 * 
		 * Jeśli nie, wysyła zapytanie do serwera o wygenerowanie nowego UID
		 * 
		 * Zwraca UID
		 */
		function beginTransaction() {
			var UID = localStorage.getUID();
			if( UID ) return UID;
			else return generateUID();
		}
		
		/**
		 * Wysyła żądanie do serwera o UID
		 */
		function generateUID() {
			function saveGeneratedUID( PHPCallback ) {
				if( Object.prototype.toString.call( PHPCallback ) == "[object Object]" ) {
					log(PHPCallback, "PHPCall");
					if( PHPCallback.data.created ) {
						localStorage.saveUID( PHPCallback.data.uid );
						return PHPCallback.data.uid;
					}
				}
			}
			
			var config = { generateUID: true }
			$http.post( uniqueIDserverURL, config ).then( saveGeneratedUID, log );
		}
		
		/* STEP 2 */
		
		/**
		 * Wrzuca na serwer informacje o serwerze FTP
		 * 
		 * Deferred
		 * @param {string} UID
		 * @param {Object} ftpConfig
		 */
		function uploadInitialData( UID, ftpConfig ) {
			var deferred = $q.defer();
			var mixedData = {
				uid: UID,
				ftpConfig: ftpConfig
			}
			$http.post( handshakeURL, mixedData ).then( checkCallback, log );
			
			function checkCallback( callback ) {
				if( callback.data.bool ) deferred.resolve( callback.data.bool );
				else deferred.reject( callback.data.bool );
				
			}
			return deferred.promise;
		}
		
		/**
		 * Wrzuca config projetków na serwer
		 */
		function uploadConfig( UID, config ) {
			var deferred = $q.defer();
			log(config, "conf");
			var mixedData = {
				uid: UID,
				config: config
			}
			$http.post( mainJSONURL, mixedData ).then( PHPCallback, AJAXError );

			function PHPCallback( callback ) {
				//ToDO
				log(callback, "call");
				deferred.resolve(callback);
			}

			function AJAXError( error ) {
				log(error, "error");
				deferred.reject(error);
			}
			return deferred.promise;
		}
		
		/* STEP 3 */
		
		/**
		 * 
		 */
		function uploadPhoto( UID, photoURL ) {
			var deferred = $q.defer();
			var fileName = photoURL.split( "/" );
			var uploadConfig = {
				fileKey: "photo",
				fileName: fileName[fileName.length - 1],
				chunkedMode: false,
				params: { uid: UID }
			}
			
			$cordovaFileTransfer.upload( serverURL, photoURL, uploadConfig ).then( uploadCompleted, uploadError );
			function uploadCompleted( response ) {
				log( response, "completed");
				deferred.resolve("ok");
			}
			
			function uploadError( error ) {
				log(error, "err");
				deferred.reject("err");
			}
			
			return deferred.promise;
		}
		
		/* STEP 4 */
		
		/**
		 * Wysyła zapytanie do serwera o uporzadkowanie struktury plików dla UID
		 */
		function cleanUp( UID ) {
			var deferred = $q.defer();
			$http.post( cleanupURL, UID ).then( allOk, AJAXError );
			function allOk( callback ) {
				if( callback.data.ok ) {
					deferred.resolve( callback.data.ok );
				} 
				else {
					deferred.reject( callback.data.ok );    
				}
			}
			
			function AJAXError( err ) {
				deferred.reject( false );
			}
			return deferred.promise;
		}
		
		
		/* STEP 5 */
		
		/**
		 * Wysyła zapytanie do serwera o upload plików na serwer FTP klienta
		 */
		function uploadToHost( UID ) {
			var deferred = $q.defer();
			$http.post( requestFTPURL, UID ).then( allOk, AJAXError );
			function allOk( callback ) {
				log( callback, "cback" );
				if( callback.data.ok ) {
					deferred.resolve( callback.data.ok );
				} 
				else {
					deferred.reject( callback.data.ok );    
				}
			}
			
			function AJAXError( err ) {
				log(err, "err");
				deferred.reject( false );
			}
			return deferred.promise;
		}
		
		var host = 'http://modus360.qbiz.pl/';
		var cleanupURL = host + 'cleanup.php';
		var uniqueIDserverURL = host + 'generateuid.php';
		var mainJSONURL = host + 'jsonupload.php';
		var serverURL = host + 'upload.php';
		var handshakeURL = host + 'handshake.php';
		var requestFTPURL = host + 'requestftp.php';
	}]);