<?php
// Forward semua request ke public/index.php
// Taruh file ini di root htdocs/

$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/public/index.php';
$_SERVER['SCRIPT_NAME']     = '/public/index.php';
require __DIR__ . '/public/index.php';
