<?php
header('Access-Control-Allow-Origin: https://allpdf.cloud');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

$parsed = parse_url($url);
if (!$parsed || !in_array($parsed['scheme'] ?? '', ['http', 'https'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Only http/https URLs allowed']);
    exit;
}

$host = $parsed['host'] ?? '';
if (preg_match('/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|localhost)/', $host) || $host === '::1') {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Private/internal URLs are not allowed']);
    exit;
}

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'],
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false || $error) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => $error ?: 'Failed to fetch URL']);
    exit;
}

header('Content-Type: ' . ($contentType ?: 'text/html'));
echo $response;
