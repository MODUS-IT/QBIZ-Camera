<?php
    class mainJson {
        private $_json;
        private $_uid;
        public function __construct( $mixedData ) {
            $this -> _json = $mixedData["config"];
            $this -> _uid = $mixedData["uid"];
            if($this -> saveJson()) {
                echo json_encode(array( "bool" => true ));
            } else echo "not gut";
        }
        
        private function saveJson() {
            if(file_put_contents( $this -> _uid."/main.json", json_encode( $this -> _json ) )) {
                return true;
            }
            return;
        }
    }
    $postdata = file_get_contents("php://input");
	$request = json_decode($postdata, true);
    new mainJson( $request );
?>