# Terraform: Firebase project provisioning

Creates the GCP project, enables Firebase + Firestore, and provisions the two
credentials the app needs:

- A **Firebase Web App config** → `VITE_FIREBASE_*` values for `.env.local`
  (dashboard).
- A **service account JSON key** → the Worker's `FIREBASE_SERVICE_ACCOUNT_JSON`
  secret (`src/firebase/admin.js`).

> **Not validated in CI.** This was written and reviewed by hand but never run
> through `terraform validate`/`plan`/`apply` — there's no Terraform CLI or
> GCP credentials in the environment that authored it. Review it (especially
> resource/attribute names against the current `google-beta` provider docs)
> before applying.

## Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in project_id, billing_account, etc.

terraform init
terraform plan
terraform apply
```

## After apply

```bash
# Dashboard env vars
terraform output -json web_app_config

# Worker secret (sensitive output — printed only on request)
terraform output -raw worker_service_account_json | (cd ../../workers && wrangler secret put FIREBASE_SERVICE_ACCOUNT_JSON)
```

Then deploy `../../firestore.rules` from the Firebase Console (or via the
Firebase CLI: `firebase deploy --only firestore:rules`) — Terraform doesn't
manage rules here, since they're already tracked at the repo root.

## State

No backend is configured, so state defaults to a local `terraform.tfstate`
file — it's git-ignored because it can contain the service account's private
key in plaintext. For anything beyond solo/local use, configure a remote
backend (e.g. a GCS bucket) before running `apply`.
