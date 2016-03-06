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
 
    $urlRouterProvider.otherwise('/mainView');   
})

.controller('mainCtrl', function( $q, $scope, $ionicPlatform, $interval, $cordovaToast, $state, $cordovaDialogs, $http, $cordovaFileTransfer, FileManipulationService, JSZipService, PHPUploadService ) {
    $scope.state = $state;
    $scope.cameraInitialized = false;
    $scope.menuOpened = false; //Controls menu
    $scope.params = { pictures: 6, pictureInterval: 8, time : '5s' }; /* pictures - holds picture count from model | pictureInterval - holds interval beetween pictures in seconds */
    $scope.pictures = [ ]; //Stores pictures path
    
    var pictureLoop = { loop: undefined, counter: undefined, timer: undefined, timerCounter: undefined };
    var dataStorageUri = undefined;
    
    $ionicPlatform.ready(function () {
        dataStorageUri = cordova.file.dataDirectory;
        if( !$scope.cameraInitialized ) {
            $scope.cameraInitialized = true;
            
            /* Camera preview settings */
            var tapEnabled = false; //enable tap take picture
            var dragEnabled = false; //enable preview box drag across the screen
            var toBack = true; //send preview box to the back of the webview
            var rect = {x: 0, y: 93, width: screen.width, height: (screen.height-93) };

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
     
    $scope.even = true;
    $scope.takePicture = function() {
        if( pictureLoop.loop === undefined ) {
            pictureLoop.counter = 0;
            pictureLoop.timerCounter = 0;
            pictureLoop.loop = $interval(
                function() {
                    if($scope.even) {
                        $scope.even = false;
                        $cordovaToast.showShortCenter($scope.params.pictureInterval - pictureLoop.timerCounter + "s");
                    } else $scope.even = true;
                    pictureLoop.timerCounter++;
                    if(pictureLoop.timerCounter >= $scope.params.pictureInterval) {
                        pictureLoop.timerCounter = 0;
                        if (pictureLoop.counter < $scope.params.pictures) {
                            takePictureUtility();
                            pictureLoop.counter += 1;
                        } else {
                            cleanLoopVariables();
                        }
                    }
                }, 1000);
        }
    };
    
    $scope.takePictureUtility = function() {
        cordova.plugins.camerapreview.takePicture();
        cordova.plugins.camerapreview.setOnPictureTakenHandler(
            function(result){
                $scope.pictures.push( { src: result[0] } );
            }
        );
    }
    
    var takePictureUtility = function() {
        cordova.plugins.camerapreview.takePicture();
        cordova.plugins.camerapreview.setOnPictureTakenHandler(
            function(result){
                $scope.listDataStorage();
            }
        );
    }
    
    var cleanLoopVariables = function() {
        $interval.cancel( pictureLoop.loop );
        pictureLoop.loop = undefined;
        pictureLoop.counter = undefined;
        pictureLoop.timer = undefined;
        pictureLoop.timerCounter = undefined;
    }
    
    $scope.$watch('state.current.name', function() {
        if($scope.state.current.name == 'imageBrowser') $scope.cameraHide();
            else 
            $scope.cameraShow();
    });
    
    $scope.listDataStorage = function() {
        $cordovaToast.showShortTop('Init: List Data Storage');
        FileManipulationService.listDirectory( dataStorageUri ).then(function ( entriesArray ) {
            $scope.files = entriesArray;
            $scope.pictures = entriesArray;
            $cordovaDialogs.alert( entriesArray.length );
        }, function( err ) {
            $cordovaDialogs.alert( err );
        });
    };
    
    $scope.getPhotos = function() {
        console.log('Init: Get Photos');
        FileManipulationService.getPhotos( dataStorageUri ).then(function( base64Images ) {
            console.log( base64Images );
            JSZipService.packImages( base64Images );
            var zip = JSZipService.getGeneratedZip();
            console.error(zip);
            FileManipulationService.saveFile( dataStorageUri, 'photos.zip', zip ).then(function(result) {
                FileManipulationService.getBinaryFile( dataStorageUri, 'photos.zip' ).then(function(result) {
                    PHPUploadService.uploadFile( dataStorageUri + 'photos.zip' ).then(function(result) {
                        console.log(JSON.stringify(result));
                    }, function(err) {
                        console.error(JSON.stringify(err));
                    });
                }, function(err) {
                    console.error(JSON.stringify(err));
                });
            }, function(err) {
                console.log(JSON.stringify(err));
            });
        }, function( err ) {
            console.error( JSON.stringify(err) );
        });
    }
    
    $scope.generateZip = function() {

    }
    
    $scope.purgeDir = function() {
        $cordovaToast.showShortTop('Init purge...');
        var directory;
        FileManipulationService.listDirectory( dataStorageUri ).then(function ( entriesArray ) {
            directory = entriesArray;
            angular.forEach( directory, function(photo, key) {
                if(photo.isFile) {
                     window.resolveLocalFileSystemURL( dataStorageUri,
                        function (fileSystem) {
                            fileSystem.getFile( photo.name , { create:false }, function(file) {
                                file.remove(function() {
                                    $cordovaToast.showShortTop( 'Del.good' );
                                }, function( err ) {
                                    $cordovaToast.showShortTop(err);
                                });
                            }, function(err) {
                                $cordovaToast.showShortTop(err);
                            });
                    }, function(err) {
                        $cordovaDialogs.alert(err);
                    })
                } 
            });
            
        }, function( err ) {
            $cordovaDialogs.alert( err );
        });

    };
    
})

.service('JSZipService', ['$q', function($q) {
    var zipFile = new JSZip();
    var generatedZip;
    
    function removeHeader( data ) {
        return data.replace('data:image/jpeg;base64,', '');
    }
    
    function packImage( image ) {
        var data = image.data;
        data = removeHeader( data );
        zipFile.file( image.name, data, { base64: true } );
    }
    
    this.packImages = function( base64Images ) {
        angular.forEach( base64Images, function( image, index ) {
            packImage( image );
        });
        generatedZip = zipFile.generate();
    }
    
    this.getGeneratedZip = function() {
        return generatedZip;
    }
    
}])

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
            var base64Images = [];
            angular.forEach( entriesArray, function( photo, key ) {
                console.log( 'Key: ' + key );
                console.log( 'Photo: ' + JSON.stringify(photo) );
                if( photo.isFile && isJPEG( photo.name ) ) {
                    photosCount++;
                    getPhotoDataURL( dataURI, photo.name ).then( function( result ) {
                        console.log( 'Loaded: ' + JSON.stringify( result ) );
                        base64Images.push( { name: photo.name, data: result } )
                        filesLoaded++;
                        if( filesLoaded == photosCount ) {
                            console.log('All files loaded!');
                            console.log( base64Images );
                            deferred.resolve( base64Images );
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

.service('PHPUploadService', ['$q', '$cordovaFileTransfer', 'FileManipulationService', function($q, $cordovaFileTransfer, FileManipulationService) {
    
    var serverURL = 'http://modus360.qbiz.pl/upload.php';
    var options = {
        fileKey: "file",
        fileName: 'photos.zip',
        chunkedMode: false,
        mimeType: "application/zip;base64,",
    };
    
    this.uploadFile = function( fileURL ) {
        var deferred = $q.defer();
        $cordovaFileTransfer.upload( serverURL, fileURL, options).then( function(result) {
            deferred.resolve(result);
        }, function(err) {
            deferred.reject(err);
        });
        return deferred.promise;
    }
}]);