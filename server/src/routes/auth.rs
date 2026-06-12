use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use std::sync::Arc;

use crate::AppState;

/// Read the JWT signing secret from the environment.
/// The server refuses to start (see `main.rs`) if this is unset, so by the time
/// any request is handled we always have a real secret here.
pub fn jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_default()
}

/// Validate a bearer token and return the user id (`sub` claim) on success.
pub fn validate_token(token: &str) -> Result<i32, ()> {
    let secret = jwt_secret();
    if secret.is_empty() {
        return Err(());
    }
    let data = jsonwebtoken::decode::<serde_json::Value>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|_| ())?;

    let user_id = data.claims.get("sub").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
    if user_id <= 0 {
        return Err(());
    }
    Ok(user_id)
}

/// Axum middleware: require a valid `Authorization: Bearer <jwt>` header.
/// Applied to all protected routes. Public routes (auth, health, share) bypass this.
pub async fn require_auth(
    req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, StatusCode> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "));

    match token {
        Some(t) if validate_token(t).is_ok() => Ok(next.run(req).await),
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Like `require_auth`, but also accepts the token from a `?token=` query param.
/// Used for endpoints loaded directly by the browser (iframes, embedded fetches)
/// where an Authorization header cannot be set.
pub async fn require_auth_flexible(
    req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> Result<axum::response::Response, StatusCode> {
    // 1. Try the Authorization header
    let header_ok = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .map(|t| validate_token(t).is_ok())
        .unwrap_or(false);

    if header_ok {
        return Ok(next.run(req).await);
    }

    // 2. Fall back to a ?token= query parameter
    let query_ok = req
        .uri()
        .query()
        .map(|q| {
            url_decode_token(q)
                .map(|t| validate_token(&t).is_ok())
                .unwrap_or(false)
        })
        .unwrap_or(false);

    if query_ok {
        Ok(next.run(req).await)
    } else {
        Err(StatusCode::UNAUTHORIZED)
    }
}

/// Extract and percent-decode the `token` parameter from a raw query string.
fn url_decode_token(query: &str) -> Option<String> {
    for pair in query.split('&') {
        if let Some(val) = pair.strip_prefix("token=") {
            // Minimal percent-decoding for the token value
            let decoded = val
                .replace('+', " ")
                .replace("%2B", "+")
                .replace("%2F", "/")
                .replace("%3D", "=");
            return Some(decoded);
        }
    }
    None
}

#[derive(serde::Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(serde::Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub username: String,
    pub display_name: Option<String>,
}

#[derive(sqlx::FromRow)]
struct UserRow {
    pub id: i32,
    pub username: String,
    pub password_hash: String,
    pub display_name: Option<String>,
    pub role: Option<String>,
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, (StatusCode, String)> {
    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, display_name, role FROM users WHERE username = ?"
    )
    .bind(&body.username)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "Invalid username or password".to_string()))?;

    // Verify password
    let valid = bcrypt::verify(&body.password, &user.password_hash)
        .unwrap_or(false);

    if !valid {
        return Err((StatusCode::UNAUTHORIZED, "Invalid username or password".to_string()));
    }

    // Generate JWT
    let secret = jwt_secret();
    let claims = serde_json::json!({
        "sub": user.id,
        "username": user.username,
        "role": user.role.as_deref().unwrap_or("admin"),
        "exp": chrono::Utc::now().timestamp() + 86400 * 7, // 7 days
    });

    let token = jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &claims,
        &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Token generation failed: {}", e)))?;

    Ok(Json(LoginResponse {
        token,
        username: user.username,
        display_name: user.display_name,
    }))
}

/// POST /api/auth/register (for initial setup only)
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), (StatusCode, String)> {
    // Check if any users exist — only allow registration if no users
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if count.0 > 0 {
        return Err((StatusCode::FORBIDDEN, "Registration disabled. Users already exist.".to_string()));
    }

    let hash = bcrypt::hash(&body.password, 10)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Hash failed: {}", e)))?;

    sqlx::query("INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, 'admin')")
        .bind(&body.username)
        .bind(&hash)
        .bind(&body.username)
        .execute(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok((StatusCode::CREATED, Json(serde_json::json!({ "message": "User created" }))))
}

/// GET /api/auth/me — validate token and return user info
pub async fn me(
    State(state): State<Arc<AppState>>,
    req: axum::http::Request<axum::body::Body>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let token = req
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or((StatusCode::UNAUTHORIZED, "Missing token".to_string()))?;

    let secret = jwt_secret();
    let data = jsonwebtoken::decode::<serde_json::Value>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

    let user_id = data.claims.get("sub").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

    let user = sqlx::query_as::<_, UserRow>(
        "SELECT id, username, password_hash, display_name, role FROM users WHERE id = ?"
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
    .ok_or((StatusCode::UNAUTHORIZED, "User not found".to_string()))?;

    Ok(Json(serde_json::json!({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "role": user.role,
    })))
}

/// Check if the system has any registered users (for initial setup flow).
pub async fn check_setup(
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(serde_json::json!({ "has_users": count.0 > 0 })))
}
