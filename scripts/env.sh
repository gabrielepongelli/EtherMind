#!/bin/sh

VARIABLE_PREFIX=ETHERMIND_

for i in $(env | grep ${VARIABLE_PREFIX})
do
    key=$(echo $i | cut -d '=' -f 1)
    value=$(echo $i | cut -d '=' -f 2-)
    echo $key=$value

    # sed JS and CSS only
    find /app -type f \( -name '*.js' -o -name '*.css' \) -exec sed -i "s|${key}|${value}|g" '{}' +
done