param(
    [Parameter(Mandatory = $true)]
    [string]$Email,
    [string]$ProjectUrl = 'https://joywzpjefzsybizccpne.supabase.co'
)

$ErrorActionPreference = 'Stop'

function Convert-SecureInputToText([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

Write-Host "Reset the Supabase Auth password for $Email"
Write-Host 'Copy this user ID from Supabase > Authentication > Users.'
$targetUserId = Read-Host 'User UID'
$parsedUserId = [guid]::Empty
if (-not [guid]::TryParse($targetUserId, [ref]$parsedUserId)) {
    throw 'A valid Supabase Auth user UUID is required.'
}

$serverKey = Read-Host 'Supabase service_role or secret server key (hidden)' -AsSecureString
$password = Read-Host 'New Auth password (hidden)' -AsSecureString
$confirmation = Read-Host 'Repeat new password (hidden)' -AsSecureString

$variableNames = @('BGA_RESET_URL', 'BGA_RESET_EMAIL', 'BGA_RESET_UID', 'BGA_RESET_KEY', 'BGA_RESET_PASSWORD')
$previousValues = @{}
foreach ($name in $variableNames) {
    $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
}

try {
    $passwordText = Convert-SecureInputToText $password
    $confirmationText = Convert-SecureInputToText $confirmation
    if ($passwordText -cne $confirmationText) { throw 'Passwords do not match.' }
    if ($passwordText.Length -lt 12) { throw 'Choose a password with at least 12 characters.' }

    $env:BGA_RESET_URL = $ProjectUrl
    $env:BGA_RESET_EMAIL = $Email
    $env:BGA_RESET_UID = $parsedUserId.ToString()
    $env:BGA_RESET_KEY = Convert-SecureInputToText $serverKey
    $env:BGA_RESET_PASSWORD = $passwordText

    Push-Location (Split-Path -Parent $PSScriptRoot)
    try {
        @'
import { createClient } from '@supabase/supabase-js';

try {
  const client = createClient(process.env.BGA_RESET_URL, process.env.BGA_RESET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const id = process.env.BGA_RESET_UID;
  const expectedEmail = process.env.BGA_RESET_EMAIL.trim().toLowerCase();
  const lookup = await client.auth.admin.getUserById(id);
  if (lookup.error) throw lookup.error;
  if (lookup.data.user?.email?.trim().toLowerCase() !== expectedEmail) {
    throw new Error('The user UID does not match the requested email; nothing was changed.');
  }
  const result = await client.auth.admin.updateUserById(id, {
    password: process.env.BGA_RESET_PASSWORD
  });
  if (result.error) throw result.error;
  console.log('Auth password updated successfully. Sign in using your new password.');
} catch (error) {
  console.error('Password reset failed:', error.message);
  process.exitCode = 1;
}
'@ | node --input-type=module
        if ($LASTEXITCODE -ne 0) { throw 'Reset was not completed. Check the error above.' }
    } finally {
        Pop-Location
    }
} finally {
    foreach ($name in $variableNames) {
        [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process')
    }
    $passwordText = $null
    $confirmationText = $null
    $serverKey.Dispose()
    $password.Dispose()
    $confirmation.Dispose()
}
