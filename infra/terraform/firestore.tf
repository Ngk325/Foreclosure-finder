# Firestore Native database backing the app's `listings`, `properties`,
# `attorney_contacts`, `outreach_log`, and `analysis` collections.
# See ../../firestore.rules for the security rules deployed alongside it.
resource "google_firestore_database" "default" {
  provider    = google-beta
  project     = google_project.default.project_id
  name        = "(default)"
  location_id = var.firestore_location
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_firebase_project.default]
}
