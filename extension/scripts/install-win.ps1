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
# lista de produções compartilhada: 'O_PADEIRO_config.json' na pasta do padeiro (a que contém a pasta
# da extensão). O caminho é gravado para a extensão achar o arquivo mesmo rodando da cópia local.
$config = Join-Path (Split-Path $src -Parent) 'O_PADEIRO_config.json'
$prefs = Join-Path $env:APPDATA 'O PADEIRO script'

if (Test-Path $config) {
	New-Item -ItemType Directory -Path $prefs -Force | Out-Null
	[System.IO.File]::WriteAllText((Join-Path $prefs 'shared_config.txt'), $config)
	Write-Host "lista de produções compartilhada: $config"
} else {
	Write-Host "aviso: não achei $config - sem ele não há lista de produções (instale a partir da pasta do padeiro na rede)"
}

# versão antiga (script ScriptUI): o instalador dela gravava 'O PADEIRO.jsx' nas preferências de cada versão do AE
Get-ChildItem (Join-Path $env:APPDATA 'Adobe\After Effects') -Directory -ErrorAction SilentlyContinue | ForEach-Object {
	$old = Join-Path $_.FullName 'Scripts\ScriptUI Panels\O PADEIRO.jsx'
	if (Test-Path $old) {
		Remove-Item $old -Force
		Write-Host "versão antiga (script) removida: $old"
	}
}

Write-Host 'reinicie o After Effects e abra: Window > Extensions > O PADEIRO'
