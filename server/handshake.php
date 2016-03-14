<?php

    class handShake {
        private $_uid;
        private $_ftpConfig;
        private $_ftpConnection;
        private $status = array(
            "bool" => true,
            "msg" => "all ok"
        ); 
        public function __construct( $mixedData ) {
            $this -> _uid = $mixedData['uid'];
            $this -> _ftpConfig = $mixedData['ftpConfig'];
            if( $this -> verifyUniqueID() ) {
                $this -> ftpCheck();
            } else {
                $this -> status[ "bool" ] = false;
            }
            echo json_encode($this -> status);
        }
        
        private function verifyUniqueID() {
            if( file_exists ( $this -> _uid ) ) {
                return true;
            } 
            if( $this -> recreateUniqueDir() ) {
                return true;
            }
            return;
        }
        
        private function recreateUniqueDir() {
            if( mkdir( $this -> _uid ) ) {
                return true;
            }
            return;
        }
        
        private function ftpCheck() {
            if( $this -> checkFtpHost() ) {
                if( $this -> checkFtpCredentials() ) {
                    if( !$this -> saveFtpCredentials() ) {
                       $this -> status[ "bool" ] = false;
                       $this -> status[ "msg" ] = "Cannot save cred";
                    }
                } else {
                    $this -> status[ "bool" ] = false;
                    $this -> status[ "msg" ] = "Wrong creds";
                }
            }
            else {
                $this -> status[ "bool" ] = false;
                $this -> status[ "msg" ] = "Wrong host";
            }
        }
        
        private function checkFtpHost() {
            $this -> _ftpConnection = ftp_connect( $this -> _ftpConfig[ "server" ] );
            if( $this -> _ftpConnection ) {
                return true;
            } else 
                return;
        }
        
        private function checkFtpCredentials() {
            if( ftp_login( $this -> _ftpConnection , $this -> _ftpConfig["user"], $this -> _ftpConfig["password"] ) ) {
                return true;
            } else 
                return;
        }
        
        private function saveFtpCredentials() {
            if(file_put_contents( $this -> _uid."/ftp.json", base64_encode( json_encode( $this -> _ftpConfig ) ) )) {
                return true;
            }
            return;
        }
        
    }
	$postdata = file_get_contents("php://input");
	$request = json_decode($postdata, true);
    new handShake( $request );

?>