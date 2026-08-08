# Service account the Cloudflare Worker (workers/scheduler.js, via
# src/firebase/admin.js) authenticates as to write to Firestore.
resource "google_service_account" "worker" {
  project      = google_project.default.project_id
  account_id   = var.worker_service_account_id
  display_name = "Foreclosure Scanner Cloudflare Worker"

  depends_on = [google_project_service.default]
}

resource "google_project_iam_member" "worker_datastore_user" {
  project = google_project.default.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

# A long-lived JSON key. This is the simplest option for a Worker that can't
# do Workload Identity Federation, but it's a durable credential — rotate it
# periodically and keep it out of source control (it's only ever emitted as
# a sensitive Terraform output, below).
resource "google_service_account_key" "worker_key" {
  service_account_id = google_service_account.worker.name
}
