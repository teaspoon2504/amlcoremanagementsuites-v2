<?php
require_once __DIR__ . '/../Core/Auth.php';
require_once __DIR__ . '/../Models/User.php';

class AuthController {
    private User $m;
    public function __construct() { $this->m = new User(); }

    public function login(): void {
        $b = json_decode(file_get_contents('php://input'),true) ?? [];
        $username = trim($b['username'] ?? '');
        $password = trim($b['password'] ?? '');
        if (!$username || !$password) Auth::json(['error'=>'Username dan password wajib diisi'],400);
        $user = $this->m->findByUsername($username);
        if (!$user || !password_verify($password, $user['password']))
            Auth::json(['error'=>'Username atau password salah'],401);
        $this->m->touchLogin((int)$user['id']);
        Auth::login($user);
        Auth::json(['success'=>true,'user'=>Auth::check()]);
    }

    public function logout(): void { Auth::logout(); Auth::json(['success'=>true]); }

    public function checkSession(): void {
        $u = Auth::check();
        $u ? Auth::json(['authenticated'=>true,'user'=>$u]) : Auth::json(['authenticated'=>false],401);
    }

    public function listUsers(): void {
        Auth::requireSuperAdmin();
        Auth::json($this->m->getAll());
    }

    public function createUser(): void {
        Auth::requireSuperAdmin();
        $b = json_decode(file_get_contents('php://input'),true) ?? [];
        $u = trim($b['username']??''); $p = trim($b['password']??'');
        $n = trim($b['full_name']??''); $r = $b['role']??'staff_user';
        if (!$u||!$p||!$n) Auth::json(['error'=>'Semua field wajib diisi'],400);
        if (!in_array($r,['super_admin','staff_user'])) Auth::json(['error'=>'Role tidak valid'],400);
        $this->m->create($u,$p,$n,$r) ? Auth::json(['success'=>true]) : Auth::json(['error'=>'Username sudah digunakan'],409);
    }

    public function updateUser(): void {
        Auth::requireSuperAdmin();
        $b      = json_decode(file_get_contents('php://input'),true) ?? [];
        $action = $_GET['action'] ?? '';
        $id     = (int)($b['id'] ?? 0);
        if (!$id) Auth::json(['error'=>'ID diperlukan'],400);

        if ($action === 'set_active')
            Auth::json(['success'=>$this->m->setActive($id,(int)($b['value']??0))]);

        if ($action === 'set_permission') {
            $col = $b['column']??''; $val = (int)($b['value']??0);
            Auth::json(['success'=>$this->m->setPermission($id,$col,$val)]);
        }

        if ($action === 'reset_password') {
            $p = trim($b['password']??'');
            if (!$p) Auth::json(['error'=>'Password baru wajib diisi'],400);
            Auth::json(['success'=>$this->m->resetPassword($id,$p)]);
        }
        Auth::json(['error'=>'Action tidak dikenal'],400);
    }

    public function deleteUser(): void {
        Auth::requireSuperAdmin();
        $id = (int)($_GET['id']??0);
        if (!$id) Auth::json(['error'=>'ID diperlukan'],400);
        Auth::json(['success'=>$this->m->delete($id)]);
    }
}
