<?php
    class uniqueIDGenerator {
        private $_uidLength = 10;
        public function __construct( $_jsGenerate ) {
            if ($_jsGenerate) {
                $generatedUID = $this -> generateUID();
                if( $this -> createDir($generatedUID) ) {
                    $response = [];
                    $response['created'] = true;
                    $response['uid'] = $generatedUID;
                    $this -> returnJ($response);
                }
                else {
                    $response = [];
                    $response['created'] = false;
                    $this -> returnJ($response);
                }
            }
            else {
                $reponse = [];
                $response['created'] = false;
                $response['error'] = "no option";
                $this -> returnJ($response);
            }
        }
        
        private function generateUID() {
            $chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
            $dirName = "";
            
            for( $i = 0; $i < ($this -> _uidLength); $i++ ) {
                $dirName .= $chars[ rand(0, strlen($chars) - 1) ];
            }

            return $dirName;
        }
        
        private function createDir( $uniqueID ) {
            if( mkdir( $uniqueID ) ) {
                return true;
            }
            return;
        }
        
        private function returnJ( $obj ) {
            echo json_encode($obj);
        }
        
    }
    
    $_angularInput = file_get_contents( "php://input" );
	$_angularPost = json_decode( $_angularInput, true );
    new uniqueIDGenerator( $_angularPost['generateUID'] );
?>