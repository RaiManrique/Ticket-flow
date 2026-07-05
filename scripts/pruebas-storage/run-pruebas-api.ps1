$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Out = if ($env:TF_OUT) { $env:TF_OUT } else { Join-Path $ScriptDir "output" }
$Api = "http://127.0.0.1:3000/api"
$ValDir = Join-Path $Out "validaciones"
$Img = Join-Path $ScriptDir "assets\prueba-imagen.jpg"

New-Item -ItemType Directory -Force -Path $ValDir | Out-Null

function Save-Json($name, $obj) {
  $path = Join-Path $ValDir $name
  $obj | ConvertTo-Json -Depth 8 | Set-Content -Path $path -Encoding UTF8
  return $path
}

function Invoke-Api($Method, $Uri, $Body = $null, $Token = $null) {
  $headers = @{ "Content-Type" = "application/json" }
  if ($Token) { $headers["Authorization"] = "Bearer $Token" }
  try {
    if ($Method -eq "GET") {
      return @{ ok = $true; status = 200; data = Invoke-RestMethod -Uri $Uri -Method GET -Headers $headers }
    }
    if ($Method -eq "DELETE") {
      $resp = Invoke-WebRequest -Uri $Uri -Method DELETE -Headers $headers -UseBasicParsing
      return @{ ok = $true; status = $resp.StatusCode; data = ($resp.Content | ConvertFrom-Json) }
    }
    $json = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 6 } else { "{}" }
    $resp = Invoke-WebRequest -Uri $Uri -Method $Method -Headers $headers -Body $json -UseBasicParsing
    return @{ ok = $true; status = $resp.StatusCode; data = ($resp.Content | ConvertFrom-Json) }
  } catch {
    $r = $_.Exception.Response
    $status = if ($r) { [int]$r.StatusCode } else { 0 }
    $content = ""
    if ($r -and $r.GetResponseStream()) {
      $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
      $content = $reader.ReadToEnd()
    } elseif ($_.ErrorDetails.Message) { $content = $_.ErrorDetails.Message }
    $parsed = try { $content | ConvertFrom-Json } catch { @{ raw = $content } }
    return @{ ok = $false; status = $status; data = $parsed; raw = $content }
  }
}

function Upload-File($Token, $FilePath, $ContentType = "image/jpeg") {
  Add-Type -AssemblyName System.Net.Http
  $client = New-Object System.Net.Http.HttpClient
  $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $Token)
  $content = New-Object System.Net.Http.MultipartFormDataContent
  $bytes = [System.IO.File]::ReadAllBytes($FilePath)
  $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($ContentType)
  $content.Add($fileContent, "file", [System.IO.Path]::GetFileName($FilePath))
  try {
    $response = $client.PostAsync("$Api/upload", $content).GetAwaiter().GetResult()
    $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $parsed = try { $body | ConvertFrom-Json } catch { @{ raw = $body } }
    return @{ ok = $response.IsSuccessStatusCode; status = [int]$response.StatusCode; data = $parsed }
  } finally { $client.Dispose() }
}

$results = @()
$badReg = Invoke-Api POST "$Api/auth/register" @{ email = "mal"; username = "x"; password = "123"; nombre_completo = "a" }
Save-Json "01-validacion-registro-invalido.json" $badReg | Out-Null
$results += "Registro invalido -> HTTP $($badReg.status)"

$ts = Get-Date -Format "HHmmss"
$user = @{ nombre_completo = "Usuario Prueba API SO"; email = "testapi$ts@ticketflow.test"; username = "testapi$ts"; password = "TicketFlow2026!" }
$reg = Invoke-Api POST "$Api/auth/register" $user
Save-Json "02-registro-api-exito.json" $reg | Out-Null
if (-not $reg.ok) { throw "Registro API fallo: $($reg.data.error)" }
$token = $reg.data.token
$results += "Registro API OK -> $($user.username)"

$badPub = Invoke-Api POST "$Api/social/publicaciones" @{ texto = "hola" } $token
Save-Json "03-validacion-texto-corto.json" $badPub | Out-Null
$results += "Texto corto rechazado -> HTTP $($badPub.status)"

$upload = Upload-File $token $Img
Save-Json "04-upload-imagen-spaces.json" $upload | Out-Null
if (-not $upload.ok) { throw "Upload imagen fallo: $($upload.data.error)" }
$mediaUrl = $upload.data.url
$results += "Upload imagen OK -> $mediaUrl"

$pub = Invoke-Api POST "$Api/social/publicaciones" @{ texto = "Prueba API imagen $ts subida a Spaces"; media_urls = @($mediaUrl) } $token
Save-Json "05-publicacion-con-imagen.json" $pub | Out-Null
if (-not $pub.ok) { throw "Publicacion fallo: $($pub.data.error)" }
$pubId = $pub.data._id
$results += "Publicacion imagen OK -> id $pubId"

$del = Invoke-Api DELETE "$Api/social/publicaciones/$pubId" $null $token
Save-Json "06-eliminar-publicacion.json" $del | Out-Null
$results += "Eliminar publicacion -> HTTP $($del.status)"

Save-Json "RESUMEN-API.json" @{ fecha = (Get-Date).ToUniversalTime().ToString('o'); usuario_api = $user.username; media_url_imagen = $mediaUrl; publicacion_eliminada_id = $pubId; resultados = $results } | Out-Null
$results | ForEach-Object { Write-Host $_ }
