param(
  [Parameter(Mandatory=$true)][string]$Project,
  [string]$Region = 'asia-southeast1',
  [Parameter(Mandatory=$true)][string]$SqlConnection,
  [Parameter(Mandatory=$true)][string]$ServiceAccount,
  [Parameter(Mandatory=$true)][string]$Image,
  [Parameter(Mandatory=$true)][string]$Origin,
  [string]$ServiceName = 'misa-event-report',
  [string]$DatabaseSecret = 'misa-event-report-database-url:1',
  [string]$AdminSecret = 'misa-event-report-admin-password:1',
  [string]$MemberSecret = 'misa-event-report-member-password:1',
  [switch]$PublicAccess
)
$ErrorActionPreference = 'Stop'
# Provision Cloud SQL, service account and secrets first; see CLOUD-RUN.md.
# No long-lived JSON key is deployed. ADC uses the runtime service account.
# Public access exposes the login page; application authentication remains mandatory.
$AccessFlag = if ($PublicAccess) { '--allow-unauthenticated' } else { '--no-allow-unauthenticated' }
gcloud run deploy $ServiceName --project=$Project --region=$Region --image=$Image --service-account=$ServiceAccount --add-cloudsql-instances=$SqlConnection --set-secrets="DATABASE_URL=$DatabaseSecret,SUPER_ADMIN_PASSWORD=$AdminSecret,DEFAULT_MEMBER_PASSWORD=$MemberSecret" --set-env-vars="APP_ORIGIN=$Origin,COOKIE_SECURE=true,GOOGLE_CLOUD_PROJECT=$Project,GEMINI_MODEL=gemini-4-argon,SUPER_ADMIN_EMAIL=bmtuan@misa.com.vn,SYNC_INTERVAL_SECONDS=0" --memory=1Gi --cpu=1 --concurrency=20 --min-instances=0 --max-instances=1 --timeout=300 --ingress=all $AccessFlag
if ($LASTEXITCODE -ne 0) { throw 'Cloud Run deployment failed.' }
gcloud run jobs deploy "$ServiceName-sync" --project=$Project --region=$Region --image=$Image --service-account=$ServiceAccount --set-cloudsql-instances=$SqlConnection --set-secrets="DATABASE_URL=$DatabaseSecret" --set-env-vars="GOOGLE_CLOUD_PROJECT=$Project,GEMINI_MODEL=gemini-4-argon" --command=node --args=server/sync-job.js --tasks=1 --max-retries=1 --task-timeout=600 --memory=1Gi
if ($LASTEXITCODE -ne 0) { throw 'Sync job deployment failed.' }
Write-Host 'Service and sync job deployed. Configure authenticated Cloud Scheduler and the requested ingress policy as described in CLOUD-RUN.md.'
