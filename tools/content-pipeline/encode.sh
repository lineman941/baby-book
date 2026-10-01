#!/usr/bin/env bash
# Encodes a raw Playwright .webm into a TikTok/Etsy-spec mp4: 720x1280,
# h264, faststart, <=14s, silent (music gets added at publish time).
# Usage: encode.sh <raw.webm> <out.mp4>
set -euo pipefail
RAW="$1"
OUT="$2"
FF="$(python3 -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())' 2>/dev/null || echo ffmpeg)"
"$FF" -y -i "$RAW" -t 14 -vf "scale=720:1280,fps=30" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 -movflags +faststart -an \
  "$OUT"
echo "$OUT"
