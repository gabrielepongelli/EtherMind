#!/bin/sh

set -e

# run scripts in /docker-entrypoint.d/
if [ -d "/docker-entrypoint.d/" ]; then
  for script in /docker-entrypoint.d/*; do
    if [ -x "$script" ]; then
      echo "Running $script"
      "$script"
    else
      echo "Ignoring $script, not executable"
    fi
  done
fi

# execute the CMD provided as arguments to the entrypoint
exec "$@"
