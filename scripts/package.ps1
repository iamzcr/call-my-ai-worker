<#
  Call My AI Worker - Edge / Chrome Web Store 打包脚本
  用法:
    powershell -ExecutionPolicy Bypass -File scripts\package.ps1
    powershell -ExecutionPolicy Bypass -File scripts\package.ps1 -Bump minor
    powershell -ExecutionPolicy Bypass -File scripts\package.ps1 -Bump none

  说明:
    - 默认自动 patch 递增 manifest.json 版本（商店要求每次提交版本递增）
    - 只打包发布所需文件，排除 .git / _metadata / 脚本 / 文档 / 临时文件
    - 打包后校验 manifest 引用文件、扫描疑似密钥、列出 zip 条目
#>
[CmdletBinding()]
param(
    [ValidateSet('patch', 'minor', 'major', 'none')]
    [string]$Bump = 'patch',
    [string]$OutDir = 'dist',
    [switch]$KeepStaging
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $scriptDir
$manifestPath = Join-Path $root 'manifest.json'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# ---------- 1. manifest 校验 ----------
$raw = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8
$manifest = $raw | ConvertFrom-Json
if ($manifest.manifest_version -ne 3) { throw 'manifest.json 不是 MV3 扩展' }
$oldVersion = [string]$manifest.version
$newVersion = $oldVersion

# ---------- 2. 版本自增 ----------
function Bump-Version([string]$v, [string]$part) {
    $parts = $v.Split('.')
    while ($parts.Count -lt 3) { $parts += '0' }
    switch ($part) {
        'patch' { $parts[2] = [string]([int]$parts[2] + 1) }
        'minor' { $parts[1] = [string]([int]$parts[1] + 1); $parts[2] = '0' }
        'major' { $parts[0] = [string]([int]$parts[0] + 1); $parts[1] = '0'; $parts[2] = '0' }
    }
    while ($parts.Count -gt 1 -and $parts[-1] -eq '0') { $parts = $parts[0..($parts.Count - 2)] }
    return ($parts -join '.')
}

if ($Bump -ne 'none') {
    $newVersion = Bump-Version $oldVersion $Bump
    $raw = [regex]::Replace($raw, '("version"\s*:\s*")[^"]+(")', ('${1}' + $newVersion + '$2'))
    [System.IO.File]::WriteAllText($manifestPath, $raw, $utf8NoBom)
    $manifest = $raw | ConvertFrom-Json
    Write-Host "版本: $oldVersion -> $newVersion"
} else {
    Write-Host "版本保持: $oldVersion"
}

# ---------- 3. 暂存发布文件 ----------
$include = @('manifest.json', 'rules.json', 'app', 'background', 'content', 'options', 'lib', 'icons', 'asset')
$staging = Join-Path $env:TEMP ("cmaw-pkg-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null

try {
    foreach ($item in $include) {
        $src = Join-Path $root $item
        if (-not (Test-Path -LiteralPath $src)) { throw "缺少发布文件: $item" }
        Copy-Item -LiteralPath $src -Destination $staging -Recurse -Force
    }

    # 清理垃圾文件
    Get-ChildItem -LiteralPath $staging -Recurse -File -Force | Where-Object {
        $n = $_.Name
        ($n -like '*.tmp') -or ($n -like '*.log') -or ($n -like '*.bak') -or ($n -like '*.ps1') -or
        ($n -like '*.zip') -or ($n -eq 'Thumbs.db') -or ($n -eq '.DS_Store')
    } | Remove-Item -Force -ErrorAction SilentlyContinue

    # ---------- 4. 校验 manifest 引用文件 ----------
    Write-Host "`n[校验] manifest 引用文件:"
    $refs = @()
    if ($manifest.background -and $manifest.background.service_worker) { $refs += $manifest.background.service_worker }
    if ($manifest.content_scripts) {
        foreach ($cs in $manifest.content_scripts) {
            if ($cs.js) { foreach ($j in $cs.js) { $refs += $j } }
        }
    }
    if ($manifest.options_ui -and $manifest.options_ui.page) { $refs += $manifest.options_ui.page }
    if ($manifest.declarative_net_request) {
        foreach ($r in $manifest.declarative_net_request.rule_resources) { if ($r.path) { $refs += $r.path } }
    }
    foreach ($ic in @('16', '48', '128')) {
        if ($manifest.icons -and $manifest.icons.$ic) { $refs += $manifest.icons.$ic }
        if ($manifest.action -and $manifest.action.default_icon -and $manifest.action.default_icon.$ic) { $refs += $manifest.action.default_icon.$ic }
    }
    $refs = $refs | Where-Object { $_ } | Sort-Object -Unique
    foreach ($r in $refs) {
        $ok = Test-Path -LiteralPath (Join-Path $staging $r)
        Write-Host "   $(if ($ok) { '[OK]' } else { '[缺失]' }) $r"
        if (-not $ok) { throw "manifest 引用缺失: $r" }
    }

    # ---------- 5. 密钥扫描 ----------
    Write-Host "`n[校验] 密钥扫描:"
    $secretHits = Get-ChildItem -LiteralPath $staging -Recurse -File | Where-Object {
        $_.Extension -in '.js', '.html', '.json'
    } | Select-String -Pattern 'sk-[A-Za-z0-9]{16,}', 'sk-or-v1-', 'apiKey\s*[:=]\s*\S{12,}', 'Bearer [A-Za-z0-9_-]{16,}' -AllMatches
    if ($secretHits) {
        Write-Host "   警告: 发现疑似密钥/Token:"
        $secretHits | Select-Object -First 10 | ForEach-Object {
            Write-Host ("     {0} : {1}" -f ($_.Path -replace [regex]::Escape($staging), '.'), $_.Matches[0].Value)
        }
    } else {
        Write-Host "   未发现疑似密钥"
    }

    # ---------- 6. 打包 zip ----------
    if (-not (Test-Path -LiteralPath (Join-Path $root $OutDir))) {
        New-Item -ItemType Directory -Path (Join-Path $root $OutDir) | Out-Null
    }
    $zipPath = Join-Path $root (Join-Path $OutDir ("call-my-ai-worker-v" + $newVersion + ".zip"))
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipPath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    $size = (Get-Item -LiteralPath $zipPath).Length
    $sizeKb = [math]::Round($size / 1KB, 1)
    Write-Host "`n[打包完成] $zipPath ($sizeKb KB)"

    $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
    try {
        $entryCount = $zip.Entries.Count
        Write-Host "   zip 条目数: $entryCount"
        $tops = $zip.Entries | ForEach-Object { ($_.FullName -split '/')[0] } | Sort-Object -Unique
        Write-Host "   顶层目录: $($tops -join ', ')"
    } finally {
        $zip.Dispose()
    }
} finally {
    if (-not $KeepStaging) {
        Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# ---------- 7. 提交流程提示 ----------
Write-Host @"

[商店提交提示]
1) Chrome Web Store: https://chrome.google.com/webstore/devconsole 上传 zip，填写说明/隐私/权限用途
2) Edge Add-ons: https://partner.microsoft.com/dashboard/microsoftedge 上传 zip
3) 需在后台说明的权限用途: storage / tabs / windows / scripting / system.display / webNavigation / declarativeNetRequest / host_permissions <all_urls>
4) CSP: 无内联脚本，满足 script-src 'self'
5) 第三方库: lib/marked.umd.js (MIT) 与 lib/dompurify.js (Apache-2.0/MPL-2.0) 已本地打包，提交时声明
"@
