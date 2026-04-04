---
title: "Command Line Tools"
categories: [Code, Powershell]
---

# Command Line Tools

## 1. Setup

- Powershell 7
  - <https://learn.microsoft.com/en-us/powershell/scripting/install/installing-powershell-on-windows>
  - `notepad $profile` or `code $profile`
    - <https://gist.github.com/UndefinedVoidNull/055e23f8d9df82cf650d4e5f0a8f6f06>
    - `Set-Alias -Name ALIAS_NAME -Value COMMAND -Scope Global`
- Windows Terminal
  - Set AHK Shortcut: **Win + Backtick  to open wt.exe**
  
  ```ahk
  #`::Run, wt.exe
  ```
- MSYS2
  - <https://www.msys2.org/>
  - Add to `$env:path`
- Starship
  - <https://starship.rs/>
  - Config: 
    - Win+R: `%USERPROFILE%\.config\starship.toml`
    - <https://gist.github.com/UndefinedVoidNull/24cd0afd8bab03950723eebcc4a5806b>
- On-My-Posh (Not Recommend)
  - <https://ohmyposh.dev/>

## 2. Basic Tools

- Package Manager
  - `winget`
  - `choco`
  - `scoop` 
- `lsd` (ls)
  - <https://github.com/lsd-rs/lsd>
- `z` zoxide  (smarter cd)
  - <https://github.com/ajeetdsouza/zoxide>
- `rg` ripgrep (grep)
  - <https://github.com/BurntSushi/ripgrep>
- `bat` (cat)
  - <https://github.com/sharkdp/bat>
- `fd` (find)
  - <https://github.com/sharkdp/fd>
- `fzf` (fuzzy find)
  - <https://github.com/junegunn/fzf>
- `dua` Disk Usage Analyzer (du) 
  - <https://github.com/Byron/dua-cli>
- `gsudo` (sudo)
  - <https://github.com/gerardog/gsudo>
- `icdiff` Improved colored diff (diff)
  - <https://github.com/jeffkaufman/icdiff>
- `new` (New-Item) (Paste into `$profile`)
```powershell
function new {
    param(
        [Parameter(Mandatory)]
        [string]$Name
    )

    if ($Name -match '\.') {
        # Contains a dot, assume it's a file
        New-Item -Path $Name -ItemType File -Force
    } else {
        # No dot, assume it's a directory
        New-Item -Path $Name -ItemType Directory -Force
    }
}
```

## 3. Application Tools

- `conda` Anaconda
  - <https://www.anaconda.com/download-success>
- `gh` GitHub CLI
  - <https://cli.github.com/>
- `ffmpeg`
  - <https://www.ffmpeg.org/>
- `magick` ImageMagick
  - <https://imagemagick.org/script/command-line-tools.php>
- `http` httpie (curl)
  - <https://github.com/httpie/cli>
- `yt-dlp`
  - <https://github.com/yt-dlp/yt-dlp>
- `aria2c`
  - <https://aria2.github.io/>
- `calibre`
  - <https://calibre-ebook.com/download_windows>
  - <https://manual.calibre-ebook.com/generated/en/cli-index.html>
  - `ebook-convert`
    - <https://manual.calibre-ebook.com/generated/en/ebook-convert.html>
  - `2pdf` (Paste into `$profile`)
```powershell
function 2pdf {
    param (
        [string]$inputFile
    )

    if (-not $inputFile) {
        Write-Host "Usage: 2pdf 'inputfile'"
        return
    }

    # Ensure the input file exists
    if (-not (Test-Path $inputFile)) {
        Write-Host "Error: File '$inputFile' does not exist."
        return
    }

    # Determine the output file name by changing the extension to .pdf
    $outputFile = [System.IO.Path]::ChangeExtension($inputFile, "pdf")

    # Run ebook-convert
    try {
        ebook-convert $inputFile $outputFile
        Write-Host "Converted '$inputFile' to '$outputFile'"
    } catch {
        Write-Host "Error: Conversion failed. Ensure 'ebook-convert' is installed and supports the input file format."
    }
}
```

## 4. Commons

- `code` (Open With Visual Studio Code)
- `h` (history)
- `cls` (clear)
- `pwd` print current directory
- `ipconfig /flushdns`
- `netsh interface ip show dns`
- `netsh wlan show profiles`
- `netsh wlan show profile name="Wi-Fi_Name" key=clear`
- `ping`
- `ssh`
- `ssh-keygen`
- `ftp`
- `robocopy`
- `ps` Get-Process
- `kill` Stop-Process
- `gc -head 10` Get-Content (head)
- `gc -tail 10` Get-Content (tail)
- `Rename-Item old_name new_name` (mv)
- `Get-Alias`

## 5. Git

<https://git-scm.com/downloads/win>

- `.git`
- `.gitignore`

```bash
git init
git add # add files to staging area
git commit -m "..." # commit to local repo

git clone
git push origin main
git push origin
git push
git pull # fetch and merge
git fetch
git merge
git rebase

git statsh

git branch
git checkout
git merge

git status
git log
git diff
```

## 6. `Win + R`

- `shell:startup`
- `%USERPROFILE%`
- `%USERPROFILE%/Desktop`
- `%USERPROFILE%/Downloads`
- `%USERPROFILE%/Documents`
- `%USERPROFILE%/Pictures`
- `%ALLUSERSPROFILE%`
- `%APPDATA%`
- `%LOCALAPPDATA%`
- `%WINDIR%`
- `%WINDIR%\system32`
- `%WINDIR%\system32\drivers\etc\hosts`
- `%PROGRAMFILES%`
- `%PROGRAMFILES(X86)%`
- `%TEMP%`