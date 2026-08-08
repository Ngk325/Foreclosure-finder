# Firebase Management API calls need a billing/quota project to bill against,
# but that project doesn't exist yet on the very first apply (we're creating
# it). This alias skips that requirement for the project-creation and
# API-enablement steps; the default provider below is used everywhere else
# once the project exists. This mirrors Firebase's official Terraform
# quickstart (https://firebase.google.com/docs/projects/terraform/get-started).
provider "google-beta" {
  alias                  = "no_user_project_override"
  user_project_override  = false
}

provider "google-beta" {
  user_project_override = true
  billing_project        = var.project_id
}

provider "google" {
  user_project_override = true
  billing_project        = var.project_id
}
