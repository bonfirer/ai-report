# ── Build stage ─────────────────────────────────────────────
# Compiles the axum API server in release mode.
# The official rust image (buildpack-deps based) already ships gcc, needed by
# the bundled ODPI-C (oracle) C sources. We add pkg-config + libssl-dev for
# reqwest's OpenSSL (native-tls) backend.
FROM rust:1-bookworm AS build

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Cache dependency compilation: build against the manifests with a stub main,
# so changing only src/ doesn't re-download/re-compile every crate.
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs \
    && cargo build --release --locked \
    && rm -rf src

# Now copy the real sources + migrations and build for real.
COPY src ./src
COPY migrations ./migrations
# Touch so cargo notices the new main.rs is newer than the cached artifact.
RUN touch src/main.rs && cargo build --release --locked

# ── Runtime stage ───────────────────────────────────────────
# Slim image with just the shared libs the binary needs at runtime.
# (Migrations are embedded via include_str!, so no SQL files are needed here.)
FROM debian:bookworm-slim AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/target/release/ai-report-server /usr/local/bin/ai-report-server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# API server port (kept internal; the web/nginx container proxies to it).
EXPOSE 3001

# A persistent volume is mounted here to hold an auto-generated JWT secret
# when one isn't supplied via the environment.
VOLUME ["/data"]

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
