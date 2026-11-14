# ---------------------------------------------------------------
# > mapear pastas: a árvore de pastas de um servidor, num arquivo (Windows)
# ---------------------------------------------------------------
#
# O mesmo do mapear-pastas.sh: lista só as PASTAS (nada é aberto, copiado ou alterado), até alguns níveis para
# dentro, e grava na Área de Trabalho um arquivo com uma linha por pasta:
#
#   nivel   subpastas   arquivos   caminho (a partir da pasta mapeada)
#
#   powershell -ExecutionPolicy Bypass -File mapear-pastas.ps1 "L:\" 4
#   powershell -ExecutionPolicy Bypass -File mapear-pastas.ps1 "\\servidor\EDIT_IN_PLACE\PROMO\cdesign_output" 5

param([Parameter(Mandatory = $true)][string]$Raiz, [int]$Niveis = 4)

if (-not (Test-Path -LiteralPath $Raiz -PathType Container)) {
	Write-Host "a pasta não existe ou não está acessível: $Raiz"
	exit 1
}

$raizItem = Get-Item -LiteralPath $Raiz
$base = $raizItem.FullName.TrimEnd('\')
$nome = ($raizItem.Name -replace '[\\/: ]', '_')
$saida = Join-Path ([Environment]::GetFolderPath('Desktop')) ("mapa_{0}_{1}.tsv" -f $nome, (Get-Date -Format 'yyyyMMdd_HHmm'))

Write-Host "mapeando $base ($Niveis níveis)…"

$pastas = @($raizItem)
if ($Niveis -gt 0) {
	$pastas += Get-ChildItem -LiteralPath $base -Directory -Recurse -Depth ($Niveis - 1) -ErrorAction SilentlyContinue | Where-Object { $_.FullName.Substring($base.Length) -notmatch '\\\.' }
}

$linhas = New-Object System.Collections.Generic.List[string]
$linhas.Add("nivel`tsubpastas`tarquivos`tcaminho")

foreach ($p in ($pastas | Sort-Object FullName)) {
	$rel = $p.FullName.TrimEnd('\').Substring($base.Length).TrimStart('\')
	$nivel = if ($rel -eq '') { 0 } else { ($rel -split '\\').Count }
	$dentro = @(Get-ChildItem -LiteralPath $p.FullName -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike '.*' })
	$sub = @($dentro | Where-Object { $_.PSIsContainer }).Count
	$arq = $dentro.Count - $sub
	$caminho = if ($rel -eq '') { '.' } else { $rel -replace '\\', '/' }
	$linhas.Add(("{0}`t{1}`t{2}`t{3}" -f $nivel, $sub, $arq, $caminho))
}

[System.IO.File]::WriteAllLines($saida, $linhas, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ("pronto: {0} pastas" -f ($linhas.Count - 1))
Write-Host "  $saida"
