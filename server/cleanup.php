<?php
    /*
        Tworzy x katalogów
            W każdym katalogu wrzuca zdjęcia zgodnie z tablicą CONFIG
            Tworzy nowy config z listą zdjęć, nazwą projektu
    */
    
    class Project {
        //Instancja jednego projektu
        private $id;
        private $projectName;
        private $images;
        private $uid;
        private $dir;
        
        public function __construct( $uid, $id, $projectName, $images ) {
            $this -> uid = $uid;
            $this -> id = $id;
            $this -> projectName = $projectName;
            $this -> images = $images;
            $this -> dir = $this -> generate().$this -> id;
            
        }
        
        public function CreateProjectDirectory() {
            if( mkdir( $this -> uid."/".$this -> dir ) ) {
                $this -> MoveImages();
            } else {
                echo "Dahm";
            }
        }
        
        public function MoveImages() {
            foreach ($this -> images as $key => $image) {
                $workingPath = explode( "/", $image );
                $fileName = $workingPath[ count( $workingPath ) - 1 ];
                rename( $this -> uid."/".$fileName, $this -> uid."/".$this -> dir."/".($key + 1).".jpg" );
                $this -> images[$key] = ($key + 1).".jpg";
            }
            $this -> copyIncludes();
            $this -> createCustomJS();
            $this -> createConfigFile();
        }
        
        private function copyIncludes() {
            copy( 'threesixty.html', $this -> uid."/".$this -> dir."/index.html" );
            copy( 'threesixty.css', $this -> uid."/".$this -> dir."/threesixty.css" );
            copy( 'threesixty.min.js', $this -> uid."/".$this -> dir."/threesixty.min.js" );
            mkdir( $this -> uid."/".$this -> dir."/assets/" );
            copy( 'sprites.png', $this -> uid."/".$this -> dir."/assets/sprites.png" );
        }
        
        private function createCustomJS() {
            $script = "window.onload = init; var product; function init(){ product = $('.product').ThreeSixty({ playSpeed: ".( (15/count($this -> images))*1000 ).", totalFrames: ".count($this -> images).", endFrame: ".count($this -> images).", currentFrame: 1, imgList: '.threesixty_images', progress: '.spinner', imagePath:'', filePrefix: '', ext: '.jpg', height: window.innerHeight, width: window.innerWidth, navigation: true, disableSpin: false }); window.onresize = scale; var img = document.createElement('img'); img.setAttribute('src', $('li img').eq(0).attr('src') ); img.onload = scale; function scale() { console.log( img.width + ' ' + img.height ); if(img.width < img.height) {
            $('.product').css({ 'width': 'auto', 'height' : window.innerHeight }); $('img').css({ width: 'auto', height: '100%' }); } } }";
            file_put_contents( $this -> uid."/".$this -> dir."/custom.js", $script );
        }
        
        private function createConfigFile() {
            $mixed = array(
                "projectName" => $this -> projectName,
                "id" => $this -> id,
                "images" => $this -> images
            );
            file_put_contents( $this -> uid."/".$this -> dir."/config.json", json_encode($mixed) );
        }
        
        public function getDirName() {
            return $this -> dir;
        }
        
        private function generate() {
            $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            $dirName = "";
            
            for( $i = 0; $i < 4; $i++ ) {
                $dirName .= $chars[ rand(0, strlen($chars) - 1) ];
            }

            return $dirName;
        }
    }
    
    class Projects {
        private $config;
        private $projects = [];
        public function __construct( $uid ) {
            $this -> getConfig( $uid );
        }
        
        private function getConfig( $uid ) {
            $configStr = file_get_contents( $uid."/main.json" );
            $this -> config = json_decode( $configStr, true );
            foreach ($this -> config as $project) {
                $projectInstance = new Project( $uid, $project["id"], $project["projectName"], $project["images"] );
                $projectInstance -> CreateProjectDirectory();
                array_push( $this -> projects, $projectInstance -> getDirName() );
            }
            if( file_put_contents( $uid."/folders.json", json_encode( $this -> projects ) ) ) {
                echo json_encode( array( "ok" => true ) );
            }
        }
    }
    
    $postdata = file_get_contents("php://input");
    new Projects( $postdata );
?>