#!/bin/bash

file_input="$1"

tesseract "$file_input" "${file_input%.*}.txt" || exit 1

exit 0
