param(
    [Parameter(Position=0, ValueFromPipeline=$true)]
    [string]$Prompt
)

begin {
    $pipelineInput = New-Object System.Text.StringBuilder
}

process {
    if ($null -ne $Prompt) {
        [void]$pipelineInput.AppendLine($Prompt)
    }
}

end {
    $rawInput = $pipelineInput.ToString().Trim()

    if ([string]::IsNullOrWhiteSpace($env:OPENROUTER_API_KEY)) {
        Write-Host "OPENROUTER_API_KEY não definida."
        exit 1
    }

    if ([string]::IsNullOrWhiteSpace($rawInput)) {
        Write-Host "Uso:"
        Write-Host '  .\or.ps1 "seu prompt"'
        Write-Host '  Get-Content .\arquivo.txt -Raw | .\or.ps1'
        Write-Host '  Get-Content .\arquivo.txt -Raw | .\or.ps1 "instrucao inicial"'
        exit 1
    }

    $lines = $rawInput -split "`r?`n", 2
    $firstLine = $lines[0].Trim()

    if ($lines.Count -gt 1) {
        $content = $lines[1]
        $finalPrompt = "$firstLine`n`n--- INÍCIO DO CONTEÚDO ---`n$content`n--- FIM DO CONTEÚDO ---"
    } else {
        $finalPrompt = $firstLine
    }

    $headers = @{
        Authorization = "Bearer $env:OPENROUTER_API_KEY"
        "Content-Type" = "application/json"
    }

    $body = @{
        model = "openrouter/free"
        messages = @(
            @{
                role = "user"
                content = $finalPrompt
            }
        )
    } | ConvertTo-Json -Depth 6

    $response = Invoke-RestMethod `
        -Uri "https://openrouter.ai/api/v1/chat/completions" `
        -Method Post `
        -Headers $headers `
        -Body $body

    $response.choices[0].message.content
}