#!/usr/bin/env node
import { Storage } from "@google-cloud/storage";
import { Command } from "commander";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync, mkdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { chmod, mkdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

export const DEFAULT_CONFIG_PATH = path.join(homedir(), ".publish-file", "config.json");
// Deliberately empty. Which project and buckets this CLI targets is instance
// data, not part of the tool — it comes from ~/.publish-file/config.json, the
// GCP_PROJECT_ID / GCS_PUBLIC_BUCKET / GCS_PRIVATE_BUCKET env vars, or --flags.
export const DEFAULT_PROJECT_ID = "";
export const DEFAULT_PUBLIC_BUCKET = "";
export const DEFAULT_PRIVATE_BUCKET = "";

function readPackageVersion() {
  try {
    const packagePath = path.join(path.dirname(path.dirname(new URL(import.meta.url).pathname)), "package.json");
    return JSON.parse(readFileSync(packagePath, "utf8")).version || "unknown";
  } catch {
    return "unknown";
  }
}

export function parseEnvContent(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [rawKey, ...rest] = line.split("=");
    const key = rawKey.trim().replace(/^export\s+/, "");
    let value = rest.join("=").trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadEnvFile(envFile) {
  if (!envFile) return {};
  const resolved = path.resolve(envFile);
  const values = parseEnvContent(readFileSync(resolved, "utf8"));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return values;
}

function readConfig(configPath) {
  if (!existsSync(configPath)) return {};
  const raw = readFileSync(configPath, "utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

export function redact(text, secret) {
  if (!text) return text;
  let redacted = String(text);
  if (secret) redacted = redacted.split(secret).join("[REDACTED_SECRET]");
  redacted = redacted.replace(/(GCP_SERVICE_ACCOUNT_B64=)[^\s"']+/g, "$1[REDACTED_SECRET]");
  redacted = redacted.replace(/("private_key"\s*:\s*")[^"]+/g, "$1[REDACTED_SECRET]");
  redacted = redacted.replace(/(Bearer\s+)[A-Za-z0-9._-]+/g, "$1[REDACTED_SECRET]");
  return redacted;
}

function getGlobalOptions(command) {
  return command.optsWithGlobals();
}

function resolveProvider(command) {
  const options = getGlobalOptions(command);
  const configPath = path.resolve(options.config || DEFAULT_CONFIG_PATH);
  loadEnvFile(options.envFile);
  const config = readConfig(configPath);
  const projectId = process.env.GCP_PROJECT_ID || config.projectId || options.project || DEFAULT_PROJECT_ID;
  const publicBucket = process.env.GCS_PUBLIC_BUCKET || config.publicBucket || options.publicBucket || DEFAULT_PUBLIC_BUCKET;
  if (!projectId || !publicBucket) {
    throw new Error(
      `publish-file is not configured. Set projectId and publicBucket in ${configPath}, ` +
        "or export GCP_PROJECT_ID and GCS_PUBLIC_BUCKET.",
    );
  }
  return {
    configPath,
    projectId,
    publicBucket,
    privateBucket: process.env.GCS_PRIVATE_BUCKET || config.privateBucket || options.privateBucket || DEFAULT_PRIVATE_BUCKET,
    source:
      process.env.GCP_PROJECT_ID || process.env.GCS_PUBLIC_BUCKET || process.env.GCS_PRIVATE_BUCKET
        ? options.envFile
          ? "env-file/env"
          : "env"
        : config.projectId || config.publicBucket || config.privateBucket
          ? "config"
          : "defaults",
  };
}

function storageFor(provider) {
  return new Storage({ projectId: provider.projectId });
}

function output(command, data) {
  const options = getGlobalOptions(command);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
    return;
  }
  if (data.message) {
    process.stdout.write(`${data.message}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function cleanPrefix(prefix) {
  if (!prefix) return "";
  return String(prefix).replace(/^\/+/, "").replace(/\/+$/, "");
}

export function inferPathname(filePath, options = {}) {
  if (options.pathname) return options.pathname.replace(/^\/+/, "");
  const basename = path.basename(filePath);
  const prefix = cleanPrefix(options.prefix);
  return prefix ? `${prefix}/${basename}` : basename;
}

function resolveAccess(options) {
  if (options.private) return "private";
  if (options.access) return options.access;
  return "public";
}

function randomizePathname(pathname) {
  const extension = path.posix.extname(pathname);
  const stem = extension ? pathname.slice(0, -extension.length) : pathname;
  return `${stem}-${randomBytes(6).toString("hex")}${extension}`;
}

function bucketNameFor(provider, access) {
  return access === "private" ? provider.privateBucket : provider.publicBucket;
}

function publicUrl(bucketName, pathname) {
  const encoded = pathname.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${bucketName}/${encoded}`;
}

function parseTarget(value, provider, access = "public") {
  if (value.startsWith("gs://")) {
    const match = value.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match) throw new Error(`Invalid Google Cloud Storage URL: ${value}`);
    return { bucketName: match[1], pathname: decodeURIComponent(match[2]) };
  }
  const publicMatch = value.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (publicMatch) {
    return { bucketName: publicMatch[1], pathname: decodeURIComponent(publicMatch[2]) };
  }
  return { bucketName: bucketNameFor(provider, access), pathname: value.replace(/^\/+/, "") };
}

function normalizeFile(file, metadata, access = "public") {
  const url = access === "public" ? publicUrl(file.bucket.name, file.name) : `gs://${file.bucket.name}/${file.name}`;
  return {
    pathname: file.name,
    url,
    downloadUrl: url,
    contentType: metadata.contentType,
    size: Number(metadata.size || 0),
    uploadedAt: metadata.timeCreated,
    etag: metadata.etag,
    generation: metadata.generation,
  };
}

async function writeConfig(configPath, provider) {
  const dir = path.dirname(configPath);
  await mkdir(dir, { recursive: true });
  await writeFile(
    configPath,
    `${JSON.stringify(
      {
        projectId: provider.projectId,
        publicBucket: provider.publicBucket,
        privateBucket: provider.privateBucket,
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  await chmod(configPath, 0o600);
}

function commandExists(commandName) {
  const escaped = commandName.replace(/'/g, "'\\''");
  const result = spawnSync("/bin/sh", ["-lc", `command -v '${escaped}'`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function commandVersion(commandName, args = ["--version"]) {
  const result = spawnSync(commandName, args, { encoding: "utf8" });
  if (result.status !== 0) return null;
  return `${result.stdout}${result.stderr}`.trim().split(/\r?\n/)[0] || null;
}

function applicationDefaultCredentialsAvailable() {
  const result = spawnSync("gcloud", ["auth", "application-default", "print-access-token"], {
    encoding: "utf8",
    stdio: ["ignore", "ignore", "ignore"],
  });
  return result.status === 0;
}

async function writeStreamToFile(stream, outPath) {
  const resolved = path.resolve(outPath);
  mkdirSync(path.dirname(resolved), { recursive: true });
  await pipeline(stream, createWriteStream(resolved));
  return resolved;
}

async function main(argv = process.argv) {
  const program = new Command();
  program
    .name("publish-file")
    .description("Codex-friendly CLI for publishing local files to durable URLs. Current provider: Google Cloud Storage.")
    .version(readPackageVersion())
    .option("--json", "Emit stable JSON to stdout")
    .option("--env-file <path>", "Load Google Cloud storage settings from a .env-style file")
    .option("--config <path>", `Config path (default: ${DEFAULT_CONFIG_PATH})`);

  program
    .command("doctor")
    .description("Verify Google Cloud CLI, application-default credentials, and bucket configuration")
    .action(function () {
      const provider = resolveProvider(this);
      const gcloudPath = commandExists("gcloud");
      const adcAvailable = Boolean(gcloudPath) && applicationDefaultCredentialsAvailable();
      output(this, {
        ok: Boolean(gcloudPath) && adcAvailable,
        command: "doctor",
        version: readPackageVersion(),
        node: process.version,
        configPath: provider.configPath,
        provider: {
          name: "google-cloud-storage",
          projectId: provider.projectId,
          publicBucket: provider.publicBucket,
          privateBucket: provider.privateBucket,
          source: provider.source,
        },
        auth: { available: adcAvailable, source: adcAvailable ? "application-default" : "missing" },
        gcloudCli: {
          available: Boolean(gcloudPath),
          path: gcloudPath || null,
          version: gcloudPath ? commandVersion("gcloud", ["version"]) : null,
        },
        missingSetup: adcAvailable ? [] : ["Run `gcloud auth application-default login`."],
      });
    });

  program
    .command("init")
    .description("Store Google Cloud project and bucket names in local config")
    .requiredOption("--project <id>", "Google Cloud project ID")
    .requiredOption("--public-bucket <name>", "Public object bucket")
    .option("--private-bucket <name>", "Private object bucket")
    .action(async function (options) {
      const globalOptions = getGlobalOptions(this);
      const configPath = path.resolve(globalOptions.config || DEFAULT_CONFIG_PATH);
      await writeConfig(configPath, {
        projectId: options.project,
        publicBucket: options.publicBucket,
        privateBucket: options.privateBucket,
      });
      output(this, { ok: true, command: "init", configPath, message: `Stored Google Cloud configuration in ${configPath}` });
    });

  program
    .command("upload")
    .description("Upload a local file to Google Cloud Storage and return its URL")
    .argument("<file>", "Local file to upload")
    .option("-p, --pathname <pathname>", "Object pathname to write")
    .option("--prefix <prefix>", "Prefix/folder to prepend when pathname is omitted")
    .option("-a, --access <access>", "Access level: public or private", "public")
    .option("--private", "Shortcut for --access private")
    .option("--add-random-suffix", "Add a random suffix to avoid pathname collisions", true)
    .option("--no-add-random-suffix", "Do not add a random suffix")
    .option("--allow-overwrite", "Allow overwriting an existing object", false)
    .option("-c, --cache-control-max-age <seconds>", "Cache-Control max-age in seconds")
    .option("-t, --content-type <mime>", "Override content type")
    .option("--multipart", "Accepted for Vercel CLI compatibility; GCS chooses upload mode automatically", false)
    .option("--dry-run", "Return the upload plan without writing")
    .action(async function (file, options) {
      const resolved = path.resolve(file);
      const fileStat = await stat(resolved);
      if (!fileStat.isFile()) throw new Error(`Not a file: ${resolved}`);
      const basePathname = inferPathname(resolved, options);
      const pathname = options.addRandomSuffix ? randomizePathname(basePathname) : basePathname;
      const access = resolveAccess(options);
      const provider = resolveProvider(this);
      const plan = {
        file: resolved,
        size: fileStat.size,
        pathname,
        access,
        bucket: bucketNameFor(provider, access),
        addRandomSuffix: Boolean(options.addRandomSuffix),
        allowOverwrite: Boolean(options.allowOverwrite),
        cacheControlMaxAge: options.cacheControlMaxAge ? Number(options.cacheControlMaxAge) : undefined,
        contentType: options.contentType || undefined,
      };
      if (options.dryRun) {
        output(this, { ok: true, command: "upload", dryRun: true, plan });
        return;
      }
      const storage = storageFor(provider);
      const bucket = storage.bucket(plan.bucket);
      const uploadOptions = {
        destination: pathname,
        metadata: {
          ...(options.contentType ? { contentType: options.contentType } : {}),
          ...(options.cacheControlMaxAge
            ? { cacheControl: `public, max-age=${Number(options.cacheControlMaxAge)}` }
            : {}),
        },
        validation: "crc32c",
        ...(!options.allowOverwrite ? { preconditionOpts: { ifGenerationMatch: 0 } } : {}),
      };
      const [uploaded] = await bucket.upload(resolved, uploadOptions);
      const [metadata] = await uploaded.getMetadata();
      const blob = normalizeFile(uploaded, metadata, access);
      output(this, {
        ok: true,
        command: "upload",
        authSource: "application-default",
        provider: "google-cloud-storage",
        file: resolved,
        size: fileStat.size,
        blob,
        url: blob.url,
      });
    });

  program
    .command("list")
    .description("List objects with bounded pagination")
    .option("-p, --prefix <prefix>", "Only list objects with this prefix")
    .option("-l, --limit <number>", "Results per page", "20")
    .option("-c, --cursor <cursor>", "Cursor from a previous page")
    .option("-m, --mode <mode>", "expanded or folded", "expanded")
    .option("--private", "List the private bucket")
    .option("--all-pages", "Read multiple pages")
    .option("--max-pages <number>", "Maximum pages when --all-pages is set", "3")
    .action(async function (options) {
      const provider = resolveProvider(this);
      const access = options.private ? "private" : "public";
      const bucket = storageFor(provider).bucket(bucketNameFor(provider, access));
      const limit = Number(options.limit);
      const maxPages = Number(options.maxPages);
      let cursor = options.cursor;
      let hasMore = true;
      const blobs = [];
      const folders = [];
      let pages = 0;
      while (hasMore) {
        pages += 1;
        const [files, nextQuery, response] = await bucket.getFiles({
          autoPaginate: false,
          maxResults: limit,
          pageToken: cursor,
          prefix: options.prefix,
          ...(options.mode === "folded" ? { delimiter: "/" } : {}),
        });
        blobs.push(...files.map((file) => normalizeFile(file, file.metadata, access)));
        folders.push(...(response.prefixes || []));
        cursor = nextQuery?.pageToken;
        hasMore = Boolean(cursor);
        if (!options.allPages || pages >= maxPages) break;
      }
      output(this, {
        ok: true,
        command: "list",
        authSource: "application-default",
        provider: "google-cloud-storage",
        bucket: bucket.name,
        blobs,
        folders: folders.length ? folders : undefined,
        cursor,
        hasMore,
        pages,
      });
    });

  program
    .command("head")
    .description("Fetch metadata for an object URL or pathname")
    .argument("<url-or-pathname>", "GCS URL or pathname")
    .option("--private", "Resolve bare pathnames in the private bucket")
    .action(async function (urlOrPathname, options) {
      const provider = resolveProvider(this);
      const access = options.private ? "private" : "public";
      const target = parseTarget(urlOrPathname, provider, access);
      const file = storageFor(provider).bucket(target.bucketName).file(target.pathname);
      const [metadata] = await file.getMetadata();
      output(this, {
        ok: true,
        command: "head",
        authSource: "application-default",
        provider: "google-cloud-storage",
        blob: normalizeFile(file, metadata, access),
      });
    });

  program
    .command("download")
    .description("Download an object to a file or stdout")
    .argument("<url-or-pathname>", "GCS URL or pathname")
    .option("-o, --out <path>", "Output file path")
    .option("-a, --access <access>", "Access level for bare pathnames: public or private", "public")
    .option("--if-none-match <etag>", "Only download if ETag differs")
    .action(async function (urlOrPathname, options) {
      const globalOptions = getGlobalOptions(this);
      if (globalOptions.json && !options.out) {
        throw new Error("download --json requires --out so stdout remains valid JSON.");
      }
      const provider = resolveProvider(this);
      const target = parseTarget(urlOrPathname, provider, options.access);
      const file = storageFor(provider).bucket(target.bucketName).file(target.pathname);
      const [metadata] = await file.getMetadata();
      if (options.ifNoneMatch && metadata.etag === options.ifNoneMatch) {
        output(this, {
          ok: true,
          command: "download",
          statusCode: 304,
          notModified: true,
          blob: normalizeFile(file, metadata, options.access),
        });
        return;
      }
      if (!options.out) {
        await pipeline(file.createReadStream(), process.stdout);
        return;
      }
      const out = await writeStreamToFile(file.createReadStream(), options.out);
      output(this, {
        ok: true,
        command: "download",
        authSource: "application-default",
        provider: "google-cloud-storage",
        statusCode: 200,
        out,
        bytes: statSync(out).size,
        blob: normalizeFile(file, metadata, options.access),
      });
    });

  program
    .command("copy")
    .description("Copy an object to a new pathname")
    .argument("<from-url-or-pathname>", "Source GCS URL or pathname")
    .argument("<to-pathname>", "Destination pathname")
    .option("-a, --access <access>", "Destination access level: public or private", "public")
    .option("--private", "Shortcut for --access private")
    .option("--add-random-suffix", "Add a random suffix to destination pathname", false)
    .option("--allow-overwrite", "Allow overwriting an existing destination object", false)
    .option("-c, --cache-control-max-age <seconds>", "Cache-Control max-age in seconds")
    .option("-t, --content-type <mime>", "Override content type")
    .option("--if-match <etag>", "Only copy if source ETag matches")
    .option("--dry-run", "Return the copy plan without writing")
    .action(async function (from, toPathname, options) {
      const provider = resolveProvider(this);
      const access = resolveAccess(options);
      const destinationPath = options.addRandomSuffix ? randomizePathname(toPathname) : toPathname;
      const plan = { from, toPathname: destinationPath, access, bucket: bucketNameFor(provider, access) };
      if (options.dryRun) {
        output(this, { ok: true, command: "copy", dryRun: true, plan });
        return;
      }
      const storage = storageFor(provider);
      const sourceTarget = parseTarget(from, provider, "public");
      const source = storage.bucket(sourceTarget.bucketName).file(sourceTarget.pathname);
      if (options.ifMatch) {
        const [sourceMetadata] = await source.getMetadata();
        if (sourceMetadata.etag !== options.ifMatch) throw new Error("Source ETag does not match.");
      }
      const destination = storage.bucket(plan.bucket).file(destinationPath);
      const [copied] = await source.copy(destination, {
        ...(!options.allowOverwrite ? { preconditionOpts: { ifGenerationMatch: 0 } } : {}),
      });
      if (options.contentType || options.cacheControlMaxAge) {
        await copied.setMetadata({
          ...(options.contentType ? { contentType: options.contentType } : {}),
          ...(options.cacheControlMaxAge
            ? { cacheControl: `public, max-age=${Number(options.cacheControlMaxAge)}` }
            : {}),
        });
      }
      const [metadata] = await copied.getMetadata();
      const blob = normalizeFile(copied, metadata, access);
      output(this, {
        ok: true,
        command: "copy",
        authSource: "application-default",
        provider: "google-cloud-storage",
        blob,
        url: blob.url,
      });
    });

  program
    .command("delete")
    .alias("del")
    .description("Delete one or more GCS URLs or pathnames")
    .argument("<url-or-pathname...>", "GCS URL(s) or pathname(s)")
    .option("--private", "Resolve bare pathnames in the private bucket")
    .option("--if-match <etag>", "Only delete if ETag matches; only valid for one object")
    .option("--dry-run", "Return the delete plan without writing")
    .action(async function (items, options) {
      if (options.ifMatch && items.length !== 1) {
        throw new Error("--if-match is only valid when deleting one object.");
      }
      if (options.dryRun) {
        output(this, { ok: true, command: "delete", dryRun: true, targets: items });
        return;
      }
      const provider = resolveProvider(this);
      const access = options.private ? "private" : "public";
      const storage = storageFor(provider);
      for (const item of items) {
        const target = parseTarget(item, provider, access);
        const file = storage.bucket(target.bucketName).file(target.pathname);
        if (options.ifMatch) {
          const [metadata] = await file.getMetadata();
          if (metadata.etag !== options.ifMatch) throw new Error("Object ETag does not match.");
        }
        await file.delete();
      }
      output(this, {
        ok: true,
        command: "delete",
        authSource: "application-default",
        provider: "google-cloud-storage",
        targets: items,
      });
    });

  program
    .command("native")
    .description("Escape hatch to the official `gcloud storage ...` CLI")
    .argument("[args...]", "Arguments after `gcloud storage`")
    .action(async function (args) {
      const globalOptions = getGlobalOptions(this);
      const child = spawn("gcloud", ["storage", ...args], {
        stdio: globalOptions.json ? ["ignore", "pipe", "pipe"] : "inherit",
      });
      if (!globalOptions.json) {
        const code = await new Promise((resolve) => child.on("close", resolve));
        process.exitCode = code || 0;
        return;
      }
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      const code = await new Promise((resolve) => child.on("close", resolve));
      output(this, {
        ok: code === 0,
        command: "native",
        code,
        stdout: redact(stdout),
        stderr: redact(stderr),
      });
      if (code !== 0) process.exitCode = code || 1;
    });

  try {
    await program.parseAsync(argv);
  } catch (error) {
    const options = program.opts();
    if (options.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            ok: false,
            error: {
              name: error?.name || "Error",
              message: redact(error?.message || String(error)),
              code: error?.code,
            },
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stderr.write(`publish-file: ${redact(error?.message || String(error))}\n`);
    }
    process.exitCode = 1;
  }
}

if (realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  await main();
}
