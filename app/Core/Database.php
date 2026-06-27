<?php
class Database {
    private static $connection;
    public static function connect() {
        if (!self::$connection) {
            $host = getenv('DB_HOST') ?: '127.0.0.1';
            $user = getenv('DB_USER') ?: 'root';
            $pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
            $db   = getenv('DB_NAME') ?: 'if0_41302221_aml_dashboard';
            self::$connection = new mysqli($host, $user, $pass, $db);
            if (self::$connection->connect_error) {
                die("Database connection failed");
            }
        }
        return self::$connection;
    }
}
