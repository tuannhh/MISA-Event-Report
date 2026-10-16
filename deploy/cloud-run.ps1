param(
  [Parameter(Mandatory=$true)][string]$Project,
  [string]$Region = 'asia-southeast1',
  [Parameter(Mandatory=$true)][string]$SqlConnection,
  [Parameter(Mandatory=$true)][string]$ServiceAccount,
  [Parameter(Mandatory=$true)][string]$Image,
  [Parameter(Mandatory=$true)][string]$Origin,
  [string]$ServiceName = 'misa-event-insights'
)
$ErrorActionPreference = 'Stop'
# Provision Cloud SQL, service account and secrets first; see CLOUD-RUN.md.
# No long-lived JSON key is deployed. ADC uses the runtime service account.
gcloud run deploy $ServiceName --project=$Project --region=$Region --image=$Image --service-account=$ServiceAccount --add-cloudsql-instances=$SqlConnection --set-secrets='DATABASE_URL=misa-event-database-url:latest,BOOTSTRAP_PASSWORD=misa-event-bootstrap-password:latest' --set-env-vars="APP_ORIGIN=$Origin,COOKIE_SECURE=true,GOOGLE_CLOUD_PROJECT=$Project,GEMINI_MODEL=gemini-4-argon,BOOTSTRAP_EMAIL=admin@misa.local,SYNC_INTERVAL_SECONDS=0" --memory=1Gi --cpu=1 --concurrency=20 --max-instances=5 --timeout=300 --no-allow-unauthenticated
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run deployment failed.' }
gcloud run jobs deploy "$ServiceName-sync" --project=$Project --region=$Region --image=$Image --service-account=$ServiceAccount --set-cloudsql-instances=$SqlConnection --set-secrets='DATABASE_URL=misa-event-database-url:latest' --set-env-vars="GOOGLE_CLOUD_PROJECT=$Project,GEMINI_MODEL=gemini-4-argon" --command=node --args=server/sync-job.js --tasks=1 --max-retries=1 --task-timeout=600 --memory=1Gi
if ($LASTEXITCODE -ne 0) { throw 'Sync job deployment failed.' }
Write-Host 'Service and sync job deployed. Configure authenticated Cloud Scheduler and IAP as described in CLOUD-RUN.md.'
