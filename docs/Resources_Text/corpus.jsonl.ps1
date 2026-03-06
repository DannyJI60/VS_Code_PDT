$InputDir = "C:\Users\DIgle\Desktop\KimiPizza\Resources_Text"
$OutFile  = "C:\Users\DIgle\Desktop\KimiPizza\pmq_corpus.jsonl"

if (!(Test-Path $InputDir)) { throw "Missing: $InputDir" }

# Overwrite output
"" | Set-Content -Path $OutFile -Encoding UTF8

Get-ChildItem -Path $InputDir -Filter *.txt -File | Sort-Object Name | ForEach-Object {
    $text = Get-Content -Path $_.FullName -Raw -Encoding UTF8
    $text = $text -replace "\r\n", "`n"   # normalize newlines

    $obj = [pscustomobject]@{
        id        = $_.BaseName
        title     = $_.BaseName
        source    = "PMQ_PDF_TXT"
        author    = "Tom Lehmann"
        file_path = $_.FullName
        text      = $text
    }

    ($obj | ConvertTo-Json -Depth 4 -Compress) | Add-Content -Path $OutFile -Encoding UTF8
}

Write-Host "Wrote corpus to $OutFile"