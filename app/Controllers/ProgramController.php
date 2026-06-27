<?php
require_once __DIR__ . '/../Models/Program.php';

class ProgramController {
    private $model;

    public function __construct() {
        $this->model = new Program();
    }

    public function handle($method) {
        header("Content-Type: application/json");

        if ($method === "GET") {
            echo json_encode($this->model->getAll());
            return;
        }

        if ($method === "POST") {
            $input = json_decode(file_get_contents("php://input"), true);

            if (!$input || !isset($input['id'])) {
                http_response_code(400);
                echo json_encode(["error" => "id required"]);
                return;
            }

            $ok = $this->model->upsert($input);
            echo json_encode(["status" => $ok ? "ok" : "error"]);
            return;
        }

        if ($method === "DELETE") {
            $id = $_GET['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(["error" => "ID required"]);
                return;
            }
            $success = $this->model->delete($id);
            echo json_encode(["status" => $success ? "deleted" : "not_found"]);
            return;
        }

        http_response_code(405);
    }
}
