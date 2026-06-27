<?php
require_once __DIR__ . '/../Core/Database.php';

class User {
    private $db;
    public function __construct() { $this->db = Database::connect(); }

    public function findByUsername(string $u): ?array {
        $s = $this->db->prepare('SELECT * FROM aml_users WHERE username=? AND is_active=1 LIMIT 1');
        $s->bind_param('s',$u); $s->execute();
        return $s->get_result()->fetch_assoc() ?: null;
    }

    public function touchLogin(int $id): void {
        $s = $this->db->prepare('UPDATE aml_users SET last_login=NOW() WHERE id=?');
        $s->bind_param('i',$id); $s->execute();
    }

    public function getAll(): array {
        $r = $this->db->query('SELECT id,username,full_name,role,is_active,can_add,can_edit,can_delete,created_at,last_login FROM aml_users ORDER BY role,full_name');
        return $r->fetch_all(MYSQLI_ASSOC);
    }

    public function create(string $u, string $p, string $n, string $r): bool {
        $h = password_hash($p, PASSWORD_BCRYPT);
        $s = $this->db->prepare('INSERT INTO aml_users (username,password,full_name,role) VALUES (?,?,?,?)');
        $s->bind_param('ssss',$u,$h,$n,$r);
        return $s->execute();
    }

    public function setActive(int $id, int $v): bool {
        $s = $this->db->prepare('UPDATE aml_users SET is_active=? WHERE id=?');
        $s->bind_param('ii',$v,$id); return $s->execute();
    }

    public function setPermission(int $id, string $col, int $v): bool {
        $allowed = ['can_add','can_edit','can_delete'];
        if (!in_array($col,$allowed)) return false;
        $s = $this->db->prepare("UPDATE aml_users SET {$col}=? WHERE id=? AND role='staff_user'");
        $s->bind_param('ii',$v,$id); return $s->execute();
    }

    public function resetPassword(int $id, string $p): bool {
        $h = password_hash($p, PASSWORD_BCRYPT);
        $s = $this->db->prepare('UPDATE aml_users SET password=? WHERE id=?');
        $s->bind_param('si',$h,$id); return $s->execute();
    }

    public function delete(int $id): bool {
        $s = $this->db->prepare('DELETE FROM aml_users WHERE id=? AND role!="super_admin"');
        $s->bind_param('i',$id); $s->execute();
        return $s->affected_rows > 0;
    }
}
