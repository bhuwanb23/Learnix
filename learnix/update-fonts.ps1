# Font Update Script
# This script updates all font families to use Plus Jakarta Sans and Manrope

Write-Host "Starting font update..." -ForegroundColor Green

# Define replacement rules
$replacements = @{
    'Inter-Bold' = 'PlusJakartaSans-Bold'
    'Inter-SemiBold' = 'PlusJakartaSans-SemiBold'
    'Inter-Medium' = 'Manrope-Medium'
    'Inter-Regular' = 'Manrope-Regular'
    "Platform.OS === 'ios' ? 'System' : 'sans-serif-condensed'" = 'PlusJakartaSans-Bold'
    "Platform.OS === 'ios' ? 'System' : 'sans-serif-medium'" = 'Manrope-Medium'
    "Platform.OS === 'ios' ? 'System' : 'sans-serif'" = 'Manrope-Regular'
}

# Get all JS files in the learnix directory
$files = Get-ChildItem -Path "d:\projects\apps\Learnix\learnix" -Filter "*.js" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    foreach ($key in $replacements.Keys) {
        $content = $content -replace $key, $replacements[$key]
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host "Font update complete!" -ForegroundColor Green
