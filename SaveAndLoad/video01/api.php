<?
    require_once('defines.php');

    error_reporting(E_ALL);
	ini_set('display_errors', 1);
	
	$conn = mysqli_connect("127.0.0.1", "root", PASSWORD);
    mysqli_select_db($conn, "games");

    $method = $_REQUEST['method'];
    $data = new stdClass;
    $data->log = array();
    $data->log[] = $method.' called';
    $data->success = false;

    switch($method){
        case 'login':
            login();
            break;
        case 'register':
            register();
            break;
        case 'save':
            save();
            break;
        case 'load':
            load();
            break;
        default:
            $data->error = "Method not supported";
            break;
    }

    echo json_encode($data);
    mysqli_close($conn);

function login(){
    global $conn, $data;
    
    $email = $_REQUEST['email'];
    $password = $_REQUEST['password'];
    
    $stmt = $conn->prepare('SELECT id, password FROM `users` WHERE `email`=?');
    $stmt->bind_param('s', $email);
    
    if ($stmt->execute()){
        $result = $stmt->get_result();
        $row = mysqli_fetch_assoc($result);
        $pwd = sha1($password.SALT);
        
        if ($pwd == $row['password']){
            $data->success = true;
            $data->message = "User logged in";
            $data->userId = $row['id'];
        }else{
            $data->error = "There was a problem with your login details.";
        }
    }else{
        $data->error = mysqli_error($conn);
    }
}

function register(){
    global $conn, $data;
    
    $name = $_REQUEST['name'];
    $email = $_REQUEST['email'];
    $password = $_REQUEST['password'];
    
    $pwd = sha1($password.SALT);
    
    $stmt = $conn->prepare('SELECT id FROM users WHERE email=?');
    $stmt->bind_param('s', $email);
    
    if ($stmt->execute()){
        $result = $stmt->get_result();
        if (mysqli_num_rows($result)>0){
            $data->error = "We already have a user with that email address";
            return;
        }
    }else{
        $data->error = mysqli_error($conn);
        return;
    }
    
    $stmt = $conn->prepare('INSERT INTO `users` (name, email, password) VALUES(?, ?, ?)');
    $stmt->bind_param('ssss', $name, $email, $pwd);
    $result = $stmt->execute();
    
    if ($result){
        $data->success = true;
        $data->message = "New user created";
        $data->userId = mysqli_insert_id($conn);
    }else{
        $data->error = mysqli_error($conn);
    }
}

function save(){
    global $conn, $data;
    
    $userId = $_REQUEST['userId'];
    $gameId = $_REQUEST['gameId'];
    $json = $_REQUEST['json'];
    
    if (empty($userId)||empty($gameId)||empty($json)){
        $data->error = "Missing parameter";
        return;
    }
    
    $stmt = $conn->prepare('DELETE FROM `games` WHERE userId=? AND gameId=?');
    $stmt->bind_param('ii', $userId, $gameId);
    $result = $stmt->execute();
    
    if (!$result){
        $data->error = mysqli_error($conn);
        return;
    }
    
    $stmt = $conn->prepare('INSERT INTO `games` (userId, gameId, `data`) VALUES(?, ?, ?)');
    $stmt->bind_param('iis', $userId, $gameId, $json);
    $result = $stmt->execute();
    
    if ($result){
        $data->success = true;
        $data->message = "Game data saved";
    }else{
        $data->error = mysqli_error($conn);
    }
}

function load(){
    global $conn, $data;
    
    $userId = $_REQUEST['userId'];
    $gameId = $_REQUEST['gameId'];
    
    if (empty($userId)||empty($gameId)){
        $data->error = "Missing parameter";
        return;
    }
    
    $stmt = $conn->prepare('SELECT `data` FROM `games` WHERE userId=? AND gameId=?');
    $stmt->bind_param('ii', $userId, $gameId);
    
    if ($stmt->execute()){
        $result = $stmt->get_result();
        if (mysqli_num_rows($result)==0){
            $data->error = "No saved games found";
        }else{
            $row = mysqli_fetch_row($result);
            $data->success = true;
            $data->json = json_decode($row[0]);
        }
    }else{
        $data->error = mysqli_error($conn);
    }
}
  
function generateRandomString($nbLetters){
    $randString="";
    $charUniverse="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for($i=0; $i<$nbLetters; $i++){
        $randInt=rand(0,61);
        $randChar=$charUniverse[$randInt];
        $randString=$randString.$randChar;
    }
    return $randString;
}
?>