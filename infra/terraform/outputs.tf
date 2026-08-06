output "project_id" {
  description = "GCP/Firebase project ID."
  value       = google_project.default.project_id
}

# Copy these into the repo root's .env.local as VITE_FIREBASE_*
# (see .env.example).
output "web_app_config" {
  description = "Firebase Web App config for the dashboard's VITE_FIREBASE_* env vars."
  value = {
    apiKey            = data.google_firebase_web_app_config.default.api_key
    authDomain        = data.google_firebase_web_app_config.default.auth_domain
    projectId         = google_project.default.project_id
    storageBucket     = try(data.google_firebase_web_app_config.default.storage_bucket, "")
    messagingSenderId = try(data.google_firebase_web_app_config.default.messaging_sender_id, "")
    appId             = google_firebase_web_app.default.app_id
  }
}

# Paste this into `wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON` (run
# from workers/) — see src/firebase/admin.js for how the Worker uses it.
output "worker_service_account_json" {
  description = "Service account JSON key for the Cloudflare Worker's FIREBASE_SERVICE_ACCOUNT_JSON secret."
  value       = base64decode(google_service_account_key.worker_key.private_key)
  sensitive   = true
}
