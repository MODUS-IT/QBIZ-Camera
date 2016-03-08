// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('cameraApp', ['ionic', 'ngCordova'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    if(window.cordova && window.cordova.plugins.Keyboard) {
      // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
      // for form inputs)
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

      // Don't remove this line unless you know what you are doing. It stops the viewport
      // from snapping when text inputs are focused. Ionic handles this internally for
      // a much nicer keyboard experience.
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if(window.StatusBar) {
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

.controller('settingsCtrl', function( $scope, localStorage, FileManipulationService, PHPUploadService, $ionicPlatform, $cordovaDialogs ) {
    //FTP Config Data
    $scope.ftp = {};
    var dataStorageUri;
    
    $ionicPlatform.ready(function () {
        dataStorageUri = cordova.file.dataDirectory;
    });
    
    $scope.readConfigurationData = function() {
        var configurationData = localStorage.getConfigurationData();
        $scope.ftp.server = configurationData.server;
        $scope.ftp.user = configurationData.user;
        $scope.ftp.password = configurationData.password;
    }
    
    $scope.saveConfigurationData = function() {
        localStorage.saveConfigurationData( $scope.ftp );
    }
    
    var rejectError = function() {
        navigator.notification.alert("Wystąpił błąd. Spróbuj jeszcze raz.");
    }
    
    var informGood = function() {
        navigator.notification.alert("Zdjęcia zostały wysłane! Kliknij Usuń wszystkie, aby wyczyścić pamięć urządzenia");
    }
    
    $scope.purgeDir = function() {
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

    }
    
    $scope.getPhotos = function() {
        var ftpSettings = localStorage.getConfigurationData();
        if( ftpSettings != "" ) {
            PHPUploadService.handshake( ftpSettings ).then(function( handshake ){
                if( handshake.data.isFTPGood ) {
                    if ( handshake.data.isSRVGood ) {
                        FileManipulationService.getPhotos( dataStorageUri ).then( function( photos ){
                            var imagesSent = 0;
                            for(var i = 0; i < photos.length; i++ )
                            {
                                PHPUploadService.uploadFile( photos[i], handshake.data.token ).then(function(resolve) {
                                    var json = JSON.parse(resolve.response);
                                    if( json.isGood ) imagesSent++;            
                                    if( imagesSent == photos.length ) {
                                        PHPUploadService.requestFTPupload( handshake.data.token ).then(informGood, rejectError);
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

.service('localStorage', [ function() {
    this.getConfigurationData = function() {
        var configurationData = window.localStorage[ 'FTPconfig' ];
        if( configurationData ) {
            return angular.fromJson( configurationData );
        }
        return { server: "", user: "", password: "" };
    }
    
    this.saveConfigurationData = function( configurationData ) {
        window.localStorage[ 'FTPconfig' ] = angular.toJson( configurationData );
    }
}])

.controller('mainCtrl', function( $q, $scope, $ionicPlatform, localStorage, $interval, $cordovaToast, $state, $cordovaDialogs, $cordovaFileTransfer, FileManipulationService, PHPUploadService ) {
    
    $scope.state = $state;
    $scope.cameraInitialized = false;
    $scope.menuOpened = false; //Controls menu
    $scope.params = { pictures: 6, pictureInterval: 8, time : '5s' }; /* pictures - holds picture count from model | pictureInterval - holds interval beetween pictures in seconds */
    $scope.files = [ ]; //Stores pictures path
    
    var pictureLoop = { loop: undefined, counter: undefined, timer: undefined, timerCounter: undefined };
    var dataStorageUri = undefined;
    
    $ionicPlatform.ready(function () {
        dataStorageUri = cordova.file.dataDirectory;
        updateGallery();
        
        if( !$scope.cameraInitialized ) {
            $scope.cameraInitialized = true;
            
            /* Camera preview settings */
            var tapEnabled = false; //enable tap take picture
            var dragEnabled = false; //enable preview box drag across the screen
            var toBack = true; //send preview box to the back of the webview
            var rect = {x: 0, y: 0, width: screen.width, height: screen.height };

            cordova.plugins.camerapreview.startCamera( rect, "back", tapEnabled, dragEnabled, toBack );
            
            /* Camera resolution fix */
            setTimeout(function() {
                cordova.plugins.camerapreview.switchCamera();
                cordova.plugins.camerapreview.switchCamera();
            }, 1000);
        }
    });
    
    $scope.toggleMenu = function() {
        if(!$scope.menuOpened) 
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
        if( pictureLoop.loop === undefined ) {
            pictureLoop.counter = 0;
            pictureLoop.timerCounter = 0;
            pictureLoop.loop = $interval(function() {
                if(even) {
                    even = false;
                    $cordovaToast.showShortCenter($scope.params.pictureInterval - pictureLoop.timerCounter + "s");
                } else even = true;
                pictureLoop.timerCounter++;
                if(pictureLoop.timerCounter >= $scope.params.pictureInterval) {
                    pictureLoop.timerCounter = 0;
                    if (pictureLoop.counter < $scope.params.pictures) {
                        takePictureUtility();
                        pictureLoop.counter += 1;
                    } else cleanLoopVariables();
                }
            }, 1000);
        }
    }
    
    var takePictureUtility = function() {
        cordova.plugins.camerapreview.takePicture();
        cordova.plugins.camerapreview.setOnPictureTakenHandler(
            function(result){
                updateGallery();
            }
        );
    }
    
    var updateGallery = function() {
        FileManipulationService.getPhotos( dataStorageUri ).then(function( images ) {
            console.log(images);
            $scope.files = images;
        });
    }
    
    var cleanLoopVariables = function() {
        $interval.cancel( pictureLoop.loop );
        pictureLoop.loop = undefined;
        pictureLoop.counter = undefined;
        pictureLoop.timer = undefined;
        pictureLoop.timerCounter = undefined;
    }
    
    $scope.$watch('state.current.name', function() {
        if($scope.state.current.name != 'mainView') $scope.cameraHide();
            else $scope.cameraShow();
    });

})

.service('FileManipulationService', ['$q', function( $q ) {
    this.listDirectory = function( path ) {
        function rejectError(err) {
            $q.reject(err);
        }
        return $q(function(resolve, reject) {
            var dirEntries = [];
            window.resolveLocalFileSystemURL(path, function (fileSystem) {
                var reader = fileSystem.createReader();
                reader.readEntries(
                    function (entries) {
                        for(var i = 0; i < entries.length; i++) {
                            dirEntries.push( entries[i] );
                        }
                        resolve(dirEntries);
                    },
                    rejectError);
        }, rejectError);
        });
    }
    
    function isJPEG( fileName ) {
        if ( fileName.indexOf('.jpg') > -1 ) return true;
        return;
    }
    
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
    }
    
    this.getBinaryFile = function( dataURI, fileName ) {
        var deferred = $q.defer();
        window.resolveLocalFileSystemURL( dataURI + fileName, function (fileEntry) {
            //fileEntry.file returns File obj connected to selected file
            fileEntry.file( function( file ) {
                var reader = new FileReader();
                reader.onloadend = function( e ) {
                    deferred.resolve( e.target.result );
                }
                reader.readAsBinaryString( file );
            });
        }, function( err ) {
            deferred.reject( err );
        });
        return deferred.promise;
    }
    
    function getPhotoDataURL( dataURI, fileName ) {
        var deferred = $q.defer();
        window.resolveLocalFileSystemURL( dataURI + fileName, function (fileEntry) {
            //fileEntry.file returns File obj connected to selected file
            fileEntry.file( function( file ) {
                var reader = new FileReader();
                reader.onloadend = function( e ) {
                    deferred.resolve( e.target.result );
                }
                reader.readAsDataURL( file );
            });
        }, function( err ) {
            deferred.reject( err );
        });
        return deferred.promise;
    }
    
    this.saveFile = function( dataURI, fileName, data ) {
        var deferred = $q.defer();
        window.resolveLocalFileSystemURL( dataURI, function( dirEntry ) {
            dirEntry.getFile( fileName, {create:true}, function(fileEntry) {
                fileEntry.createWriter(function(fileWriter) {
                   fileWriter.onwriteend = function( result ) {
                       deferred.resolve( result );
                   }
                   fileWriter.onerror = function( err ) {
                       deferred.reject( err );
                   }
                   
                   fileWriter.write( data );
                });
            });
        });
        return deferred.promise;
    }
    
}])

.service('PHPUploadService', ['$q', '$cordovaFileTransfer', 'FileManipulationService', '$http', function($q, $cordovaFileTransfer, FileManipulationService, $http) {
    
    var serverURL = 'http://modus360.qbiz.pl/upload.php';
    var handshakeURL = 'https://modus360.qbiz.pl/handshake.php';
    var requestFTPURL = 'https://modus360.qbiz.pl/requestftp.php';
    this.uploadFile = function( fileURL, token ) {
        var deferred = $q.defer();
        var options = {
            fileKey: "file",
            fileName: fileURL.name,
            chunkedMode: true,
            params: { srvToken: token },
            mimeType: "image/jpeg;base64,",
        };
        $cordovaFileTransfer.upload( serverURL, fileURL.url, options).then( function(result) {
            deferred.resolve(result);
        }, function(err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
    
    this.handshake = function( ftpConfig ) {
        var deferred = $q.defer();
        $http.post( handshakeURL , ftpConfig).then(PHPCallback, POSTError);
        
        function PHPCallback( callback ) {
            console.log(callback);
            deferred.resolve(callback);
        }
        
        function POSTError( error ) {
            console.error(error);
            deferred.reject(error);
        }
        return deferred.promise;
    }
    
    this.requestFTPupload = function( token ) {
        var deferred = $q.defer();
        $http.post( requestFTPURL, { srvToken: token } ).then( FTPCallback, POSTError );
        
        function FTPCallback( callback ) {
            if( callback.data.uploadCompleted && !callback.data.uploadErr.length ) {
                deferred.resolve( callback.data.uploadCompleted );
            } else {
                console.log( callback.data.uploadErr );
                deferred.reject( { uploadCompleted: false, uploadErrors: callback.data.uploadErr } );
            }
        }
        
        function POSTError( error ) {
            deferred.reject(error);
        }
        return deferred.promise;
    }
}]);