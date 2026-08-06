variable "project_id" {
  description = "GCP/Firebase project ID (must be globally unique)."
  type        = string
  default     = "foreclosure-finder-28b66"
}

variable "project_name" {
  description = "Human-readable GCP project name."
  type        = string
  default     = "Foreclosure-finder"
}

variable "org_id" {
  description = "GCP organization ID to create the project under. Leave null for a project outside any org (e.g. a personal account)."
  type        = string
  default     = null
}

variable "billing_account" {
  description = "Billing account ID to attach to the project. Firestore's free (Spark plan) tier doesn't strictly require one, but most Firebase features assume the project has billing linked."
  type        = string
  default     = null
}

variable "firestore_location" {
  description = "Firestore location ID, e.g. \"nam5\" (multi-region US) or a single region like \"us-east1\". Cannot be changed after the database is created."
  type        = string
  default     = "nam5"
}

variable "web_app_display_name" {
  description = "Display name for the Firebase Web App used by the dashboard."
  type        = string
  default     = "Foreclosure Scanner Dashboard"
}

variable "worker_service_account_id" {
  description = "Account ID (local part of the email) for the service account the Cloudflare Worker authenticates as."
  type        = string
  default     = "foreclosure-scanner-worker"
}
