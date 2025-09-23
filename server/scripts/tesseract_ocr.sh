#!/bin/bash

file_input="$1"

# Run Tesseract OCR
tesseract "$file_input" "${file_input%.*}" >/dev/null 2>&1 || exit 1

# Output text to JSON
cat "${file_input%.*}.txt" | \
    iconv -t utf-8 | \
    jq -sR '{ "tesseract": { "text": . } }' && rm "${file_input%.*}.txt"

exit 0
