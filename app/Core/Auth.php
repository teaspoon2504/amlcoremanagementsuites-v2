<?php
define('SESSION_NAME',    'aml_sess');
define('SESSION_TIMEOUT', 3600); // 1 jam

class Auth {
    public static function start(): void {
        if (session_status() === PHP_SESSION_NONE) {
            session_name(SESSION_NAME);
            session_set_cookie_params(['lifetime'=>SESSION_TIMEOUT,'path'=>'/','httponly'=>true,'samesite'=>'Strict']);
            session_start();
        }
    }

    public static function login(array $user): void {
        self::start();
        session_regenerate_id(true);
        $_SESSION['user'] = [
            'id'        => (int)$user['id'],
            'username'  => $user['username'],
            'full_name' => $user['full_name'],
            'role'      => $user['role'],
            'can_add'   => (int)($user['can_add']    ?? 0),
            'can_edit'  => (int)($user['can_edit']   ?? 0),
            'can_delete'=> (int)($user['can_delete'] ?? 0),
        ];
        $_SESSION['last_active'] = time();
    }

    public static function logout(): void {
        self::start(); session_unset(); session_destroy();
    }

    public static function check(): ?array {
        self::start();
        if (empty($_SESSION['user'])) return null;
        if ((time() - ($_SESSION['last_active'] ?? 0)) > SESSION_TIMEOUT) {
            self::logout(); return null;
        }
        $_SESSION['last_active'] = time();
        return $_SESSION['user'];
    }

    public static function requireAuth(): array {
        $u = self::check();
        if (!$u) self::json(['error'=>'Unauthorized'], 401);
        return $u;
    }

    public static function requireSuperAdmin(): array {
        $u = self::requireAuth();
        if ($u['role'] !== 'super_admin') self::json(['error'=>'Forbidden'], 403);
        return $u;
    }

    public static function json(array $data, int $code = 200): void {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
}
