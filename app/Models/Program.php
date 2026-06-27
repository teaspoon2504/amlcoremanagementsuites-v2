<?php
require_once __DIR__ . '/../Core/Database.php';

class Program {
    private $conn;

    public function __construct() {
        $this->conn = Database::connect();
    }

    public function getAll() {
        // ORDER BY updated_at DESC → first occurrence of each id is the newest
        $result = $this->conn->query("SELECT * FROM programs ORDER BY updated_at DESC");
        $data    = [];
        $seenIds = [];   // deduplicate: skip older duplicate rows
        while ($row = $result->fetch_assoc()) {
            $rowId = (string)$row['id'];
            if (isset($seenIds[$rowId])) continue;   // already have a newer copy
            $seenIds[$rowId] = true;

            $row['subPrograms'] = json_decode($row['sub_programs'], true) ?? [];
            $row['tag']         = $row['tag'] ?? 'Hygiene';
            unset($row['sub_programs']);

            // Parse comment: may be plain text or JSON {_fmt,narasi,history}
            $commentRaw  = $row['comment'] ?? '';
            $commentData = @json_decode($commentRaw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($commentData) && isset($commentData['_fmt'])) {
                $row['comment'] = $commentData['narasi'] ?? '';
                $row['history'] = $commentData['history'] ?? [];
            } else {
                $row['history'] = [];
            }

            $data[] = $row;
        }
        return $data;
    }

    public function upsert(array $p): bool {
        $id           = isset($p['id']) ? (string)$p['id'] : '0';
        $pillar       = $p['pillar']       ?? '';
        $pic          = $p['pic']          ?? '';
        $program      = $p['program']      ?? '';
        $deliverables = $p['deliverables'] ?? '';
        $narasi       = $p['comment']      ?? '';
        $history      = $p['history']      ?? [];
        $comment      = json_encode(['_fmt' => '1', 'narasi' => $narasi, 'history' => $history]);
        $tag          = $p['tag']          ?? 'Hygiene';
        $json         = json_encode($p['subPrograms'] ?? []);

        // Count how many rows carry this ID (handles legacy duplicates from old bug)
        $chk = $this->conn->prepare("SELECT COUNT(*) AS cnt FROM programs WHERE id = ?");
        $chk->bind_param("s", $id);
        $chk->execute();
        $cnt = (int)($chk->get_result()->fetch_assoc()['cnt'] ?? 0);
        $chk->close();

        if ($cnt > 1) {
            // Duplicate rows exist → wipe all of them, then insert one clean record
            $del = $this->conn->prepare("DELETE FROM programs WHERE id = ?");
            $del->bind_param("s", $id);
            $del->execute();
            $del->close();
            $cnt = 0;   // fall through to INSERT below
        }

        if ($cnt === 1) {
            // Single existing record → UPDATE in place (preserves created_at)
            $stmt = $this->conn->prepare(
                "UPDATE programs
                    SET pillar=?, pic=?, program=?, deliverables=?, comment=?, tag=?, sub_programs=?,
                        updated_at=CURRENT_TIMESTAMP
                  WHERE id=?"
            );
            $stmt->bind_param("ssssssss", $pillar, $pic, $program, $deliverables, $comment, $tag, $json, $id);
        } else {
            // No record → INSERT fresh
            $stmt = $this->conn->prepare(
                "INSERT INTO programs (id, pillar, pic, program, deliverables, comment, tag, sub_programs)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("ssssssss", $id, $pillar, $pic, $program, $deliverables, $comment, $tag, $json);
        }

        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    }

    public function delete($id): bool {
        $id   = (string)$id;
        $stmt = $this->conn->prepare("DELETE FROM programs WHERE id = ?");
        $stmt->bind_param("s", $id);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        $stmt->close();
        return $affected > 0;
    }
}
