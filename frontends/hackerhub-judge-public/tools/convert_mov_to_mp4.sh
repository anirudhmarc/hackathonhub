#!/usr/bin/env bash
# convert_mov_to_mp4.sh
# Usage:
#   ./tools/convert_mov_to_mp4.sh s3://bucket/path/to/input.mov [s3://bucket/path/to/output.mp4]

set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 s3://bucket/path/to/input.mov [s3://bucket/path/to/output.mp4]"
  exit 2
fi

INPUT_S3="$1"
OUTPUT_S3="${2:-}"

if [[ ! "$INPUT_S3" =~ ^s3://([^/]+)/(.+)$ ]]; then
  echo "Invalid S3 URI: $INPUT_S3"
  exit 2
fi

BUCKET="${BASH_REMATCH[1]}"
KEY="${BASH_REMATCH[2]}"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT
INPUT_FILE="$TMPDIR/input.mov"
OUTPUT_FILE="$TMPDIR/output.mp4"

echo "Downloading s3://$BUCKET/$KEY -> $INPUT_FILE"
aws s3 cp "$INPUT_S3" "$INPUT_FILE"

echo "Transcoding to H.264/AAC MP4..."
ffmpeg -y -i "$INPUT_FILE" -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k "$OUTPUT_FILE"

if [ -z "$OUTPUT_S3" ]; then
  DIR=$(dirname "$KEY")
  BASENAME=$(basename "$KEY")
  BASE_NO_EXT="${BASENAME%.*}"
  SAFE_BASE=$(echo "$BASE_NO_EXT" | sed -E 's/[[:space:]]+/-/g')
  OUTPUT_KEY="$DIR/${SAFE_BASE}.mp4"
  OUTPUT_S3="s3://$BUCKET/$OUTPUT_KEY"
fi

echo "Uploading $OUTPUT_FILE -> $OUTPUT_S3"
aws s3 cp "$OUTPUT_FILE" "$OUTPUT_S3" --acl public-read --content-type video/mp4

echo "Done. Uploaded to: $OUTPUT_S3"
