# Audio MP3 generation on Windows

This guide describes how to create announcement MP3 files for DCCExpress on Windows.

The recommended offline workflow is:

1. Piper TTS generates a `.wav` file from text.
2. FFmpeg converts the `.wav` file to `.mp3`.
3. The generated MP3 can be copied into the DCCExpress audio folder and used by audio buttons.

> Important: Piper works offline and is good enough for testing, but voice quality depends heavily on the selected language and voice model. Some voices may sound accented or robotic. For high-quality station announcements, an online neural TTS service such as Azure Speech or ElevenLabs will usually sound better.

## Folder layout

Recommended project-local folder layout:

```text
DCCExpressNext/
  Tools/
    piper/
      piper.exe
      espeak-ng.dll
      onnxruntime.dll
      piper_phonemize.dll
      espeak-ng-data/
      voices/
        hu_HU-anna-medium.onnx
        hu_HU-anna-medium.onnx.json
        en_US-lessac-medium.onnx
        en_US-lessac-medium.onnx.json
        de_DE-thorsten-medium.onnx
        de_DE-thorsten-medium.onnx.json
      out/
```

Only the voice models you actually use need to be downloaded. The examples above are just examples.

If `piper.exe` is directly inside `Tools\piper`, run it as:

```cmd
.\piper.exe
```

Do **not** run it as:

```cmd
.\piper\piper.exe
```

unless you really have this structure:

```text
Tools/
  piper/
    piper/
      piper.exe
```

## Required tools

### 1. Piper for Windows

Download the Windows x64 Piper release package from:

```text
https://github.com/rhasspy/piper/releases
```

Extract the full package into:

```text
DCCExpressNext\Tools\piper
```

Do not copy only `piper.exe`; keep the DLL files and `espeak-ng-data` folder next to it.

### 2. Piper voice model

Download the voice model for the language you want to generate.

Piper voices are available here:

```text
https://huggingface.co/rhasspy/piper-voices/tree/main
```

Every voice needs two files:

```text
<voice-name>.onnx
<voice-name>.onnx.json
```

Both files must be placed in:

```text
DCCExpressNext\Tools\piper\voices
```

The `.onnx.json` file must stay next to the `.onnx` file and must have the same base name.

Example Hungarian female voice:

```text
https://huggingface.co/rhasspy/piper-voices/tree/main/hu/hu_HU/anna/medium
```

Files:

```text
hu_HU-anna-medium.onnx
hu_HU-anna-medium.onnx.json
```

Example English voice:

```text
en_US-lessac-medium.onnx
en_US-lessac-medium.onnx.json
```

Example German voice:

```text
de_DE-thorsten-medium.onnx
de_DE-thorsten-medium.onnx.json
```

The exact available voices may change over time, so check the Piper voices repository for the current list.

### 3. FFmpeg

Install FFmpeg on Windows. One simple option is winget:

```powershell
winget install "FFmpeg (Essentials Build)"
```

After installation, close and reopen the terminal, then check:

```powershell
ffmpeg -version
```

If the command prints version information, FFmpeg is ready.

## Generate a WAV file

Open PowerShell or CMD in this folder:

```text
DCCExpressNext\Tools\piper
```

PowerShell example with Hungarian text:

```powershell
cd C:\Projects\DCCExpressNext\Tools\piper

"Tehervonat érkezik az 1. pályára. Kérem, vigyázzanak!" |
  .\piper.exe --model .\voices\hu_HU-anna-medium.onnx --output_file .\out\announcement.wav
```

PowerShell example with English text and an English voice:

```powershell
"Freight train arriving on track 1. Please stand clear." |
  .\piper.exe --model .\voices\en_US-lessac-medium.onnx --output_file .\out\announcement_en.wav
```

PowerShell example with German text and a German voice:

```powershell
"Güterzug fährt auf Gleis 1 ein. Bitte Vorsicht." |
  .\piper.exe --model .\voices\de_DE-thorsten-medium.onnx --output_file .\out\announcement_de.wav
```

CMD example with Hungarian text:

```cmd
cd C:\Projects\DCCExpressNext\Tools\piper

chcp 65001

echo Tehervonat érkezik az 1. pályára. Kérem, vigyázzanak! | .\piper.exe --model .\voices\hu_HU-anna-medium.onnx --output_file .\out\announcement.wav
```

PowerShell is recommended because it handles accented characters more reliably.

## Convert WAV to MP3

```powershell
ffmpeg -y -i .\out\announcement.wav -codec:a libmp3lame -b:a 192k .\out\announcement.mp3
```

The generated file will be:

```text
DCCExpressNext\Tools\piper\out\announcement.mp3
```

## Complete one-liner in PowerShell

Hungarian example:

```powershell
"Tehervonat érkezik az 1. pályára. Kérem, vigyázzanak!" | .\piper.exe --model .\voices\hu_HU-anna-medium.onnx --output_file .\out\announcement.wav; ffmpeg -y -i .\out\announcement.wav -codec:a libmp3lame -b:a 192k .\out\announcement.mp3
```

English example:

```powershell
"Freight train arriving on track 1. Please stand clear." | .\piper.exe --model .\voices\en_US-lessac-medium.onnx --output_file .\out\announcement_en.wav; ffmpeg -y -i .\out\announcement_en.wav -codec:a libmp3lame -b:a 192k .\out\announcement_en.mp3
```

## Useful Piper options

You can slightly slow down the voice and add a longer silence between sentences:

```powershell
"Tehervonat érkezik az 1. pályára. Kérem, vigyázzanak!" |
  .\piper.exe `
    --model .\voices\hu_HU-anna-medium.onnx `
    --length_scale 1.15 `
    --sentence_silence 0.45 `
    --output_file .\out\announcement.wav
```

Then convert to MP3:

```powershell
ffmpeg -y -i .\out\announcement.wav -codec:a libmp3lame -b:a 192k .\out\announcement.mp3
```

Notes:

- Larger `--length_scale` means slower speech.
- Larger `--sentence_silence` means longer pauses between sentences.
- These settings can help, but they will not fully remove accent or robotic pronunciation.

## Reusable PowerShell script

Create this file:

```text
DCCExpressNext\Tools\piper\make-mp3.ps1
```

Content:

```powershell
param(
  [Parameter(Mandatory = $true)]
  [string]$Text,

  [Parameter(Mandatory = $true)]
  [string]$Name,

  [Parameter(Mandatory = $true)]
  [string]$Model
)

$ErrorActionPreference = "Stop"

$OutDir = ".\out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$Wav = Join-Path $OutDir "$Name.wav"
$Mp3 = Join-Path $OutDir "$Name.mp3"

$Text | .\piper.exe --model $Model --length_scale 1.15 --sentence_silence 0.45 --output_file $Wav

ffmpeg -y -i $Wav -codec:a libmp3lame -b:a 192k $Mp3

Write-Host "MP3 created: $Mp3"
```

Usage with Hungarian voice:

```powershell
cd C:\Projects\DCCExpressNext\Tools\piper

.\make-mp3.ps1 `
  -Text "Tehervonat érkezik az 1. pályára. Kérem, vigyázzanak!" `
  -Name "freight_arrives_track_1" `
  -Model ".\voices\hu_HU-anna-medium.onnx"
```

Usage with English voice:

```powershell
.\make-mp3.ps1 `
  -Text "Freight train arriving on track 1. Please stand clear." `
  -Name "freight_arrives_track_1_en" `
  -Model ".\voices\en_US-lessac-medium.onnx"
```

Usage with German voice:

```powershell
.\make-mp3.ps1 `
  -Text "Güterzug fährt auf Gleis 1 ein. Bitte Vorsicht." `
  -Name "freight_arrives_track_1_de" `
  -Model ".\voices\de_DE-thorsten-medium.onnx"
```

Output example:

```text
DCCExpressNext\Tools\piper\out\freight_arrives_track_1.mp3
```

## Copy MP3 files into DCCExpress

After generating an MP3, copy it into the DCCExpress audio directory used by the application.

Example target:

```text
data\audio\freight_arrives_track_1.mp3
```

Then use the file name from the audio button or other audio playback configuration.

## Quality notes

Piper is useful because it is:

- offline,
- free,
- easy to document,
- scriptable,
- good enough for development and testing.

However, voice quality depends on the selected model and language. Some voices may sound accented or robotic. For production-quality station announcements, consider a neural online TTS provider.

Recommended higher-quality options:

- Azure Speech, for example `hu-HU-NoemiNeural`, `hu-HU-TamasNeural` for Hungarian
- ElevenLabs with a model/voice that supports the target language well

## Troubleshooting

### The system cannot find the path specified

Check where `piper.exe` actually is.

If this exists:

```text
Tools\piper\piper.exe
```

run:

```cmd
.\piper.exe
```

If this exists:

```text
Tools\piper\piper\piper.exe
```

run:

```cmd
.\piper\piper.exe
```

### The model cannot be loaded

Check that both files exist and have the same base name.

Example:

```text
voices\hu_HU-anna-medium.onnx
voices\hu_HU-anna-medium.onnx.json
```

Another example:

```text
voices\en_US-lessac-medium.onnx
voices\en_US-lessac-medium.onnx.json
```

### Accented characters look wrong in CMD

Use PowerShell, or run this first in CMD:

```cmd
chcp 65001
```

PowerShell is recommended for non-English text.
