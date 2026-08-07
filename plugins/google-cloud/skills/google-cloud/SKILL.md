---
name: google-cloud
description: Work with Pedro's Google Cloud through the gcloud CLI — which projects exist and what each is for, authentication, project scoping, cost-aware querying, and the safety boundary around production resources. Use for any GCP task — inspecting or provisioning resources, checking logs, auditing IAM, or figuring out which project something lives in. For Cloud Storage specifically, see the storage skill.
---

# Google Cloud

`gcloud` is the interface. It is a wrapper over the Google Cloud REST APIs
and exposes effectively the whole surface — every service, every flag. That
makes it strictly more capable than any MCP server or connector fronting the
same platform, because those expose a curated subset chosen as a product
decision, not a technical ceiling. Shell out to `gcloud`. Do not install an
MCP server to reach Google Cloud.

```bash
gcloud version
gcloud auth list
gcloud config list
```

## The Projects

Four projects exist. Getting the project wrong is the most common and most
expensive mistake here, so name it explicitly on every command rather than
relying on ambient `gcloud config` state.

| Project | What it is |
| --- | --- |
| `pedro-app-storage-20260801` | **The substrate.** App storage, artifact publishing, and production backups. Three buckets — see the `storage` skill. |
| `diana-play-publishing-20260505` | Google Play publishing for Diana's app. No buckets. |
| `gen-lang-client-0997216309` | Gemini API. Carries Vertex/AI-platform staging buckets that are not general-purpose storage. |
| `inbound-study-429220-m9` | **The personal-agent identity**, display name "Pedro Personal Agent". Holds the Desktop OAuth client behind every `gws` call (Gmail, Drive, Calendar, Docs, Sheets, Tasks, People) and the YouTube Data API behind `ytx`. No buckets. Do not delete — the opaque project ID is permanent and says nothing about what it carries. |

```bash
gcloud projects list
gcloud storage ls --project=pedro-app-storage-20260801
```

## Authentication

Two credential paths coexist and they are not interchangeable:

- **Application Default Credentials** — what local agent work uses. Set up
  with `gcloud auth application-default login`. This is what `publish-file`
  reads.
- **Service account keys** — used by deployed workloads, notably the
  avanza-control backup runner on its own server. Never copy a service
  account key onto this machine to make something work locally; use ADC.

Pedro already has a personal GCP project with a published OAuth client, so
adding a new Google API is *enable API → add scope → re-consent*, not a new
project.

```bash
gcloud auth application-default print-access-token >/dev/null && echo "ADC ok"
gcloud services list --enabled --project=<project>
```

Never print an access token, key material, or a service-account JSON into the
transcript.

## Scoping Every Command

Ambient config is a trap when four projects exist. Prefer explicit flags:

```bash
gcloud <group> <command> --project=<project> --format=json
```

Use `--format` to cut output rather than piping large JSON through context:

```bash
gcloud projects list --format="value(projectId)"
gcloud storage ls --project=<p> --format="value(name)"
gcloud logging read 'severity>=ERROR' --project=<p> --limit=20 --format=json
```

Prefer `--limit`, `--filter`, and `--format=value(...)` on anything that could
return an unbounded list. A `gcloud logging read` without `--limit` can return
enormous output.

## Safety Boundary

Read freely. Before any command that creates, modifies, deletes, or spends:

1. State the project and the exact resource.
2. Use `--dry-run` where the command supports it.
3. Get an explicit yes.

Never run without asking first:

- `gcloud projects delete`, `gcloud storage rm`, `gcloud sql instances delete`,
  or any other delete against a resource holding data
- IAM grants that widen access (`add-iam-policy-binding` with broad principals
  like `allUsers` or `allAuthenticatedUsers`)
- Anything that changes billing, quota, or org policy
- Anything touching `avanza-control` production resources — that is a live
  client system, and its Postgres backups are the only irreplaceable data in
  the substrate

Treat `gcloud` as capable of real destruction, because it is. The CLI's
breadth is the reason to prefer it and the reason to gate it.

## Provisioning

Creating resources is in scope when Pedro asks. Keep new resources inside
`pedro-app-storage-20260801` unless there is a reason not to, name them for
what they serve, and state the ongoing cost before creating anything billable.

For buckets specifically, follow the naming and prefix conventions in the
`storage` skill rather than inventing a layout.

## Reference

Google publishes exhaustive official skills for individual services
(`google/skills` on GitHub, e.g. `google-cloud-storage-basics`, `gke-*`,
`bigquery-*`). Read them upstream for deep per-service surface. Do not vendor
them into this repo and do not install them as standalone skills — this
loadout ships plugins only.
