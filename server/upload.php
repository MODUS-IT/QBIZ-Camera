<?php
    class uploadPhoto {
        private $_uid;
        private $photoName;
        public function __construct( $_uid ) {
            $this -> _uid = $_uid;
            $this -> photoName = $_FILES['photo']['name'];
            $this -> moveUploadedFile();
        }
        
        private function moveUploadedFile() {
            if( move_uploaded_file( $_FILES['photo']['tmp_name'], $this -> _uid ."/".$this -> photoName ) ) {
                echo json_encode( array( "bool" => true ) );
            } else {
                echo json_encode( array( "bool" => false ) );
            }
        }
    }
    new uploadPhoto( $_POST['uid'] );
?>