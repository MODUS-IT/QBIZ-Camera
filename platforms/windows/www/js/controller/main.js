angular.module('cameraApp.mainCtrl', []).controller('mainCtrl', function($scope, $ionicPlatform, localStorage, $ionicGesture, $interval, $cordovaNativeAudio, $timeout, $ionicModal, $cordovaToast, $state, $cordovaDialogs, $cordovaFileTransfer, FileManipulationService, PHPUploadService) {
		/*---------------------------------------ACTIONS-------------------------------------------------------------------------------------------------------------*/
        $scope.swipeRight = viewGoForward;							//App swipe right view
		$scope.swipeLeft = viewGoBack;								//App swipe left view
		$scope.selectProject = selectProject;						//Gallery select project
		$scope.cameraShow = showCamera;								//Show camera preview
		$scope.cameraHide = hideCamera;								//Hide camera preview
		$scope.toggleRightMenu = toggleRightMenu;					//Toggle camera settings on mainView
        $scope.toggleShutterSettings = toggleShutterSettings;       //Toggle shutter activation settings
		$scope.takePicture = takePicture;							//Init taking pictures
		$scope.openPreview = openPreview;							//Open image preview
        $scope.cameraAbort = abortCamera;                           //TO
        $scope.cameraTogglePause = togglePauseCamera;               //DO
        /*----------------------------------------VARS----------------------------------------------------------------------------------------------------------------*/
		$scope.projects = [];										//Projects array
		$scope.state = $state;										//Connect state to scope
		$scope.isTakingPictures = false;							//As expected
		$scope.rightMenu = false;           						//Controls menu
        $scope.shutterSettings = false;                             //Shutter activation settings
        $scope.cameraPaused = false;
		$scope.params = {
			grid: undefined,                						//Show grid
			pictures: undefined,            						//No of pics
			pictureInterval: undefined,
            shutterActivation: "timer"    							//Interval between pics in secs
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
        /*----------------------------------------FUNCTIONS-----------------------------------------------------------------------------------------------------------*/
		$ionicPlatform.ready(function() {
			dataStorageUri = cordova.file.dataDirectory;
			$scope.params = localStorage.getCameraData();
			watchCameraData();
			watchViews();
			updateGallery();
			initCamera();
			initModal();
			
			$cordovaNativeAudio.preloadSimple('click', 'click.mp3').then(log, log);
			
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
				localStorage.saveCameraData( $scope.params );
			});
            $scope.$watch('params.shutterActivation', function() {
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
			else {
                if( $scope.shutterSettings ) {
                    $scope.shutterSettings = false;
                }
                $scope.rightMenu = true;
            } 
		}
        
        function toggleShutterSettings() {
            if( $scope.shutterSettings ) $scope.shutterSettings = false;
            else {
                if( $scope.rightMenu ) {
                    $scope.rightMenu = false;
                }
                $scope.shutterSettings = true;
            }
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
				QBIZCamera.show();
			});
		}

		function hideCamera() {
			$ionicPlatform.ready(function() {
				QBIZCamera.hide();
			});
		}
		
		function initCamera() {
			if(cameraInitialized) return;
			cameraInitialized = true;
			var screen = { w: window.innerWidth, h: window.innerHeight };
			QBIZCamera.startCamera(true, screen);
			setTimeout( function() { QBIZCamera.fullRes(); }, 1000);
		}

		function takePicture() {
            if( $scope.isTakingPictures && ($scope.params.shutterActivation == "motion")) {
                finishMotionCapture();
                return;
            }
            if( $scope.isTakingPictures ) return;
			$cordovaDialogs.prompt("Wprowadź nazwę projektu", "Projekt", ["Start", "Anuluj"], "").then( startOrDecline );
			function startOrDecline( projectPrompt ) {
				//Clicked cancel
				if( projectPrompt.buttonIndex != 1 ) return;
				//Carry on going
                closeMenus();
				window.project = new Project( $scope.projects.length + 1, projectPrompt.input1 );
				$scope.projects.push( window.project );
				//Init
                switch( $scope.params.shutterActivation ) {
                    case "motion":
                        QBIZCamera.useMotionDetection();
                        QBIZCamera.motionDetectionStart();
                        QBIZCamera.setOnPictureTakenHandler( function( result ) {
                            genericTakePicture( result[0] );
                        });
                        $scope.isTakingPictures = true;
                        break;
                    default:
                    case "timer":
                        timedInit();
                        break;
                }
			}
		}
        
        function closeMenus() {
            $scope.rightMenu = false;
            $scope.shutterSettings = false;
        }
        
        function finishMotionCapture() {
            QBIZCamera.motionDetectionStop();
            $scope.isTakingPictures = false;
            if( window.project.images.length == 0 ) {
                deleteProject( window.project.id );
            }
        }
        
        function togglePauseCamera() {
            switch( $scope.params.shutterActivation ) {
                case "motion":
                    if( $scope.cameraPaused )  {
                        QBIZCamera.motionDetectionStart();
                        QBIZCamera.setOnPictureTakenHandler( function( result ) {
                            genericTakePicture( result[0] );
                        });
                    }
                    else QBIZCamera.motionDetectionStop();
                    break;
                case "default":
                    if($scope.cameraPaused) $scope.cameraPaused = false;
                    else $scope.cameraPaused = true;
                    break;
            }
        }
        
        function abortCamera() {
            $cordovaDialogs.confirm( "Czy na pewno chcesz usunać obecny projekt?", "Projekt", ["Tak", "Nie"] ).then( goOn );
            function goOn( btn ) {
                if(btn != 1) return;
                switch( $scope.params.shutterActivation ) {
                    case "motion":
                        finishMotionCapture();
                        deleteProject( window.project.id );
                        break;
                    default:
                    case "timer":
                        cleanLoopVariables();
                        break;
                }
                deleteProject( window.project.id );
            }
        }
        
        function deleteProject( projectID ) {
            for( var i = 0; i < $scope.projects.length; i++ ) {
                if( $scope.projects[i].id == projectID ) {
                    $scope.projects.splice(i - 1, 1);
                    //TODO Add imgs remove
                    FileManipulationService.saveProjects( dataStorageUri, $scope.projects ).then( showSuccess );
                    function showSuccess() {
                        $cordovaToast.showShortCenter('Usunięto!');
                    }
                }
            }
        }

        function timedInit() {
            QBIZCamera.useTimer();
            if (pictureLoop.loop === undefined) {
                pictureLoop.counter = 0;
                pictureLoop.timerCounter = 0;
                $scope.isTakingPictures = true;
                pictureLoop.loop = $interval( takePictureUsingTimer, 1000 );
            }
        }

		function takePictureUsingTimer() {
			if( timedIsTimeForPicture(pictureLoop.timerCounter, $scope.params.pictureInterval) ) {
				if( timedCanTakePicture( pictureLoop.counter, $scope.params.pictures ) ) {
					pictureLoop.counter += 1;
					$interval.cancel( pictureLoop.loop );
					takePictureUtility();
				} else cleanLoopVariables();
			}
			$scope.onScreenTimer = ( $scope.params.pictureInterval - pictureLoop.timerCounter );
            if( !$scope.cameraPaused ) pictureLoop.timerCounter += 1;
		}
        
        /**
         * Zwraca czy możesz zrobić zdjęcie na podstawie argumentów
         * @param {number} currentTime;
         * @param {number} shutterInterval;
         */
        function timedIsTimeForPicture( currentTime, shutterInterval ) {
            return currentTime >= shutterInterval;
        }
        
        function timedCanTakePicture( currentPic, noOfPicture ) {
            return currentPic < noOfPicture;
        }
        /**
         * @param {number} projectId
         */
		function takePictureUtility() {
			QBIZCamera.takePicture();
			QBIZCamera.setOnPictureTakenHandler(function( result ) {
                genericTakePicture( result[0] );
                pictureLoop.timerCounter = 0;
                if( timedCanTakePicture(pictureLoop.loop, $scope.params.pictures ) )
                    pictureLoop.loop = $interval( takePictureUsingTimer, 1000 );
            });
        }
        
        function genericTakePicture( path ) {
            for( var i = 0; i < $scope.projects.length; i++ ) {
                if( $scope.projects[i].id == window.project.id ) {
                    $scope.projects[i].images.push( path );
                    FileManipulationService.saveProjects( dataStorageUri, $scope.projects ).then( showSuccess );
                    function showSuccess() {
                        $cordovaToast.showShortCenter('Zapisano zdjęcie!');
                    }
                }
            }
            $cordovaNativeAudio.play('click');
        }
        
		function cleanLoopVariables() {
			$interval.cancel( pictureLoop.loop );
			pictureLoop.loop = undefined;
			pictureLoop.counter = undefined;
			pictureLoop.timer = undefined;
			$scope.isTakingPictures = false;
		}
	});