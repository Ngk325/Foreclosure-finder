# Reference (create) the GCP project that will back this Firebase project.
resource "google_project" "default" {
  provider        = google-beta.no_user_project_override
  name            = var.project_name
  project_id      = var.project_id
  org_id          = var.org_id
  billing_account = var.billing_account
  labels = {
    "firebase" = "enabled"
  }
}

# Enable the essential APIs needed for Firebase + Firestore.
resource "google_project_service" "default" {
  provider = google-beta.no_user_project_override
  project  = google_project.default.project_id
  for_each = toset([
    "cloudresourcemanager.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# Enable Firebase resources on the project.
resource "google_firebase_project" "default" {
  provider   = google-beta
  project    = google_project.default.project_id
  depends_on = [google_project_service.default]
}
