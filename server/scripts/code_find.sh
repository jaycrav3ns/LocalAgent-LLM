#!/bin/bash

user_input="$1"

mapfile -t list <<< $(find ../../ -type f -not -path "*/node_modules/*")

output="["
first=true

for file in "${list[@]}"; do
  mapfile -t lines < <(grep -n "$user_input" "$file")
  for line in "${lines[@]}"; do
    file_path=$(echo "$file" | cut -d '/' -f3-)
    line_number=$(echo "$line" | cut -d ':' -f1)
    content=$(echo "$line" | cut -d ':' -f2-)

    if [ "$first" = true ]; then
      first=false
    else
      output+=","
    fi

    output+="{ \"file\": \"${file_path}\", "
    output+="\"line\": \"${line_number}\", "
    output+="\"contents\": \"${content}\" }"
  done
done

output+="]"

echo "$output" | jq
