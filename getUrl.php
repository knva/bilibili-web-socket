<?php
$url = 'http://api.live.bilibili.com/room/v1/Room/get_info?room_id=' . $_GET["roomid"];

$json = json_decode(file_get_contents($url), true);

$roomid = $json["data"]["room_id"];
$cidurl = "http://api.live.bilibili.com/api/player?id=cid:" . $roomid;
$infoxml = simplexml_load_string("<root>" . file_get_contents($cidurl) . "</root>");
$xmljson = json_encode($infoxml);
$xmljson = json_decode($xmljson);

$hosturl = preg_split("/[\s,]+/", $xmljson->dm_host_list)[0];

$wsport = $xmljson->dm_wss_port;
$report = [
    "wsaddress" => "wss://" . $hosturl . ":" . $wsport . "/sub",
    "realId" => $roomid,
];
echo json_encode($report);
