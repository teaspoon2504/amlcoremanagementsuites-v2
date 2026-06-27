<?php
require_once __DIR__ . '/Auth.php';
require_once __DIR__ . '/../Controllers/ProgramController.php';
require_once __DIR__ . '/../Controllers/AuthController.php';
require_once __DIR__ . '/WeeklySystem.php';

class Router {
    public static function route(): void {
        $uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $method = $_SERVER['REQUEST_METHOD'];

        // ── AUTH API ─────────────────────────────────────────────────────────
        if (strpos($uri,'/api/auth/login')   !== false) { header('Content-Type:application/json'); (new AuthController())->login();        return; }
        if (strpos($uri,'/api/auth/logout')  !== false) { header('Content-Type:application/json'); (new AuthController())->logout();       return; }
        if (strpos($uri,'/api/auth/check')   !== false) { header('Content-Type:application/json'); (new AuthController())->checkSession(); return; }
        if (strpos($uri,'/api/auth/users')   !== false) {
            header('Content-Type:application/json');
            $c = new AuthController();
            if ($method==='GET')    { $c->listUsers();   return; }
            if ($method==='POST')   { $c->createUser();  return; }
            if ($method==='PATCH')  { $c->updateUser();  return; }
            if ($method==='DELETE') { $c->deleteUser();  return; }
            Auth::json(['error'=>'Method not allowed'],405); return;
        }

        // ── PROGRAMS API (login required) ─────────────────────────────────────
        if (strpos($uri,'/api/programs') !== false) {
            header('Content-Type:application/json');
            $user = Auth::requireAuth();
            if ($method !== 'GET' && $user['role'] === 'staff_user') {
                // Cek permission spesifik
                if ($method==='DELETE' && !$user['can_delete']) Auth::json(['error'=>'Forbidden'],403);
                if ($method==='POST'   && !$user['can_add'])    Auth::json(['error'=>'Forbidden'],403);
            }
            (new ProgramController())->handle($method);
            return;
        }

        // ── WEEKLY SYSTEM API ─────────────────────────────────────────────────
        if (strpos($uri, '/api/weekly/info') !== false) {
            header('Content-Type:application/json');
            Auth::requireAuth();
            Auth::json(WeeklySystem::getWeekFromDate($_GET['date'] ?? null));
            return;
        }
        if (strpos($uri, '/api/weekly/range') !== false) {
            header('Content-Type:application/json');
            Auth::requireAuth();
            $m = $_GET['month'] ?? date('n');
            $w = (int)($_GET['week'] ?? 1);
            $y = isset($_GET['year']) ? (int)$_GET['year'] : null;
            Auth::json(WeeklySystem::getDateRangeFromWeek($m, $w, $y));
            return;
        }

        // ── HTML VIEWS ────────────────────────────────────────────────────────
        header('Content-Type:text/html;charset=utf-8');
        if (strpos($uri,'/login') !== false) { require_once __DIR__.'/../Views/login.php'; return; }
        $currentUser = Auth::check();
        if (!$currentUser) { header('Location: login'); exit; }
        require_once __DIR__.'/../Views/dashboard.php';
    }
}
