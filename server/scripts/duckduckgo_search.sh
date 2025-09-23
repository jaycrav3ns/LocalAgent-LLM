#!/bin/bash

user_input="$1"

ddgr -n 5 -t y --json "$user_input"

exit 0
