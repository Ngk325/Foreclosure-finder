# Firebase Web App — its config is what the dashboard (src/dashboard) needs
# as VITE_FIREBASE_* env vars to initialize the client SDK.
resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = google_project.default.project_id
  display_name = var.web_app_display_name

  # If this app gets deleted outside Terraform, it can be restored from the
  # Firebase console for a limited time. See:
  # https://firebase.google.com/docs/projects/manage-installations#deleting-an-app
  deletion_policy = "DELETE"

  depends_on = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  web_app_id = google_firebase_web_app.default.app_id
}
