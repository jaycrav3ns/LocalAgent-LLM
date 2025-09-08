#!/bin/bash

user_input="$1"

video_id=$(echo "$user_input" | awk -F'/' '{print $NF}')
user_output="YouTube_${video_id}.txt"

/usr/local/bin/yt-dlp --cookies-from-browser=brave --write-sub --write-auto-sub --sub-format srt,vtt --sub-lang "en.*" --skip-download "$user_input" || exit 1

# Convert vtt to srt if needed
if ls *.vtt 1> /dev/null 2>&1; then
    ffmpeg -hide_banner -i "$(ls -1 *.vtt | head -1)" "$(ls -1 *.vtt | head -1 | sed 's/\.vtt$/.srt/')"
    rm *.vtt
fi

# Output subs as plaintext
sed '/^$/d' "$(ls -1 *.srt | head -1)" | grep -v -- '-->' | \
awk '!/^[0-9]+$/' | tr -d '\r' | \
awk '!seen[$0]++' | tr '\n' ' ' > "${user_output}" && rm *.srt

exit 0
