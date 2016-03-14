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

	.run(function($ionicPlatform, $state) {
        
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
                    navigator.app.exitApp();
                    break;
            }
        }, 100);
        
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
            
            .state('browser', {
                url: '/browser',
                views: {
                    "browser": {
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
                                                PHPUploadService.cleanUp( UID );
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
        
        this.getUID = function() {
            var UID = window.localStorage['devUID'];
            return UID;
        }
        
        this.saveUID = function( UID ) {
            window.localStorage['devUID'] = UID;
        }
	}])

	.controller('mainCtrl', function($q, $scope, $ionicPlatform, localStorage, $interval, $ionicModal, $cordovaToast, $state, $cordovaDialogs, $cordovaFileTransfer, FileManipulationService, PHPUploadService) {
		$scope.projects = [];
		$scope.state = $state;
		$scope.cameraInitialized = false;
		$scope.menuOpened = false; //Controls menu
		$scope.params = {
            pictures: 6,
            pictureInterval: 8,
            time: '5s'
        }; /* pictures - holds picture count from model | pictureInterval - holds interval beetween pictures in seconds */

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
			animation: 'slide-in-up'
		}).then(function(modal) {
			$scope.preview = modal;
		});

		$scope.openPreview = function(directoryName, pictureURL) {
			$scope.preview.show();
			$scope.preview.dirName = directoryName;
			$scope.preview.pictureURL = pictureURL;
            FileManipulationService.getFile( dataStorageUri, pictureURL, "TEXT" );
		}

		$scope.closePreview = function() {
			$scope.preview.hide();
		}
        
        $scope.selectProject = function( project ) {
            $scope.project = project;
            console.log( $scope.project );
            $state.go('^.imageBrowser');
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

		var even = true;
		 $scope.takePicture = function() {
             
            $cordovaDialogs.prompt("Wprowadź nazwę projektu", "Projekt", ["Start", "Anuluj"], "").then(function( projectPrompt ) {
				log(projectPrompt, "prompt");
                if( projectPrompt.buttonIndex == 2 ) return;
                window.project = new Project( $scope.projects.length + 1, projectPrompt.input1 );
                $scope.projects.push( window.project );
                
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
                            if (pictureLoop.counter <= $scope.params.pictures) {
                                takePictureUtility( window.project.id );
                                pictureLoop.counter += 1;
                            } else cleanLoopVariables();
                        }
                    }, 1000);
                }
            });
		 }
        
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
                log(config, "cnf");
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
			if ($scope.state.current.name == 'browser.projectBrowser') updateGallery();
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
        
        function cleanUp( UID ) {
            var deferred = $q.defer();
            $http.post( cleanupURL, UID ).then( log, log );
            return deferred.promise;
        }
        
        var cleanupURL = 'http://modus360.qbiz.pl/cleanup.php';
        var uniqueIDserverURL = 'http://modus360.qbiz.pl/generateuid.php';
        var mainJSONURL = 'https://modus360.qbiz.pl/jsonupload.php';
		var serverURL = 'http://modus360.qbiz.pl/upload.php';
		var handshakeURL = 'https://modus360.qbiz.pl/handshake.php';
		var requestFTPURL = 'https://modus360.qbiz.pl/requestftp.php';
	}]);