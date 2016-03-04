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
      StatusBar.styleDefault();
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

.controller('mainCtrl', function( $q, $scope, $ionicPlatform, $interval, $cordovaToast, $state, $cordovaDialogs, $http, $cordovaFileTransfer ) {
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
        //cordova.plugins.camerapreview.show();
    }
    
    $scope.cameraHide = function() {
        cordova.plugins.camerapreview.hide();
    }
    
    $scope.openFile = function( item ) {
        /*$cordovaToast.showShortTop(item);
        cordova.plugins.fileOpener2.open(
            item.nativeURL, 
            'image/jpeg'
        );*/
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
    
    
    
    function listDir(path){
        return $q(function(resolve, reject) {
            var dirEntries = [];
            window.resolveLocalFileSystemURL(path,
            function (fileSystem) {
                var reader = fileSystem.createReader();
                reader.readEntries(
                    function (entries) {
                        var i;
                        for(i = 0; i < entries.length; i++) {
                            dirEntries.push( entries[i] );
                        }
                        resolve(dirEntries);
                    },
                    function (err) {
                        reject('err');
                        //Do zaimplementowania - read err | no access
                    });
        }, function (err) {
            reject('err');
            //Do zaimplementowania - path not found | no access
            });
        });
    }; 
    
    $scope.listDataStorage = function() {
        $cordovaToast.showShortTop('Init list...');
        listDir( dataStorageUri ).then(function ( entriesArray ) {
            $scope.files = entriesArray;
            $scope.pictures = entriesArray;
            $cordovaDialogs.alert( entriesArray.length );
        }, function( err ) {
            $cordovaDialogs.alert( err );
        });
    };
    
    $scope.zip = new JSZip;
    
    $scope.packDir = function() {
        $cordovaToast.showShortTop('Init pack...');
        listDir( dataStorageUri ).then(function( entriesArray ) {
            angular.forEach( entriesArray, function(photo, key) {
              if(photo.isFile) {
                  $cordovaToast.showShortTop('Hello!');
                  window.resolveLocalFileSystemURL( dataStorageUri + photo.name,
                        function (fileEntry) {
                            fileEntry.file(function(file) {
                                var reader = new FileReader();
                                reader.onloadend = function(e) {
                                    $scope.zip.file(photo.name, e.result);
                                }
                                reader.readAsBinaryString(file);
                            });
                    }, function(err) {
                        $cordovaDialogs.alert(err);
                    })
              }  
            });
        });
    };
    
    $scope.generateZip = function() {
        $scope.zipFile = $scope.zip.generate({ type: 'blob' });
        
        window.resolveLocalFileSystemURI( dataStorageUri , function(directory) {
            directory.getFile( 'zip.zip', {create: true }, function(file) {
                 file.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function (e) {
                        // for real-world usage, you might consider passing a success callback
                        console.log('Write of file completed.' + e);
                    };

                    fileWriter.onerror = function (e) {
                        // you could hook this up with our global error handler, or pass in an error callback
                        console.log('Write failed: ' + e.toString());
                    };
                    fileWriter.write( $scope.zipfile );
                });
            });
        });
        
        $cordovaFileTransfer.upload('http://modus360.qbiz.pl/upload.php', dataStorageUri + 'zip.zip')
        .then(function(result) {
            // Success!
            $cordovaToast.showShortTop(result);
        }, function(err) {
            $cordovaToast.showShortTop(err);
            // Error
        }, function (progress) {
            console.log('Upload: ' + progress);
            // constant progress updates
        });
    }
    
    $scope.purgeDir = function() {
        $cordovaToast.showShortTop('Init purge...');
        var directory;
        listDir( dataStorageUri ).then(function ( entriesArray ) {
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
    
});