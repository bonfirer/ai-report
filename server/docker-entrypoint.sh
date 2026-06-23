#!/bin/sh
set -e

# The server refuses to start without a JWT_SECRET (>= 16 chars). For a
# friction-free `docker compose up`, generate a strong random secret on first
# run and persist it to the mounted /data volume so tokens survive restarts.
if [ -z "${JWT_SECRET}" ]; then
  if [ -f /data/jwt_secret ]; then
    JWT_SECRET="$(cat /data/jwt_secret)"
  else
    mkdir -p /data
    JWT_SECRET="$(od -An -tx1 -N32 /dev/urandom | tr -d ' \n')"
    echo "$JWT_SECRET" > /data/jwt_secret
    chmod 600 /data/jwt_secret
    echo "[entrypoint] Generated a new JWT_SECRET and stored it in the data volume."
  fi
  export JWT_SECRET
fi

exec ai-report-server "$@"
