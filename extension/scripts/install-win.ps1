# Instala a extensão no After Effects (Windows) para uso e desenvolvimento.
#
#   powershell -ExecutionPolicy Bypass -File install-win.ps1             copia a pasta
#   powershell -ExecutionPolicy Bypass -File install-win.ps1 -Uninstall  remove a extensão
#
# Extensões sem assinatura (.zxp) só carregam com o PlayerDebugMode ligado; o script liga para as versões CSXS 9-12.
param([switch]$Uninstall)

$ErrorActionPreference = 'Stop'

$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dest = Join-Path $env:APPDATA 'Adobe\CEP\extensions\com.jmbillard.opadeiro.panel'

if ($Uninstall) {
	Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
	Write-Host "removido: $dest"
	exit 0
}

foreach ($v in 9..12) {
	$key = "HKCU:\Software\Adobe\CSXS.$v"
	if (-not (Test-Path $key)) { New-Item -Path $key -Force | Out-Null }
	New-ItemProperty -Path $key -Name PlayerDebugMode -Value '1' -PropertyType String -Force | Out-Null
}

New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
Remove-Item $dest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item $src $dest -Recurse
Remove-Item (Join-Path $dest 'scripts') -Recurse -Force

Write-Host "copiado para: $dest"
Write-Host 'reinicie o After Effects e abra: Window > Extensions > O PADEIRO'
