import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import { AppError } from "./errors.js";

export const MAX_BYTES = 2 * 1024 * 1024;
export const TIMEOUT_MS = 8000;
export const MAX_REDIRECTS = 4;

/** True for any address a public web page should never live at: loopback, private, link-local, metadata, etc. */
export function isBlockedAddress(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224 // multicast and reserved
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    if (x === "::" || x === "::1") return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(x);
    if (mapped?.[1]) return isBlockedAddress(mapped[1]);
    return /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff") || x.startsWith("64:ff9b");
  }
  return true; // not an address at all
}

export interface FetchOptions {
  /** tests only: lets the fetcher talk to a local server */
  allowPrivate?: boolean;
  maxBytes?: number;
  timeoutMs?: number;
}

function badUrl(message: string): AppError {
  return new AppError(message, 422, "bad_url");
}

function parseUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw badUrl("That doesn't look like a web address.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw badUrl("Only http and https addresses can be imported.");
  if (u.username || u.password) throw badUrl("Addresses with a username or password can't be imported.");
  return u;
}

function oneRequest(u: URL, opts: Required<FetchOptions>): Promise<{ status: number; location?: string; body?: string; contentType?: string }> {
  return new Promise((resolve, reject) => {
    const lib = u.protocol === "https:" ? https : http;
    // The address that is checked is the address that is connected to, so DNS can't change between the two.
    const lookup: net.LookupFunction = (hostname, options, cb) => {
      dns.lookup(hostname, { ...options, all: true }, (err, addrs) => {
        if (err) return cb(err, "", 4);
        const list = Array.isArray(addrs) ? addrs : [];
        const ok = opts.allowPrivate ? list : list.filter((a) => !isBlockedAddress(a.address));
        const first = ok[0];
        if (!first || (!opts.allowPrivate && ok.length !== list.length)) {
          return cb(Object.assign(new Error("blocked address"), { code: "EBLOCKED" }), "", 4);
        }
        if (options.all) return cb(null, ok as never, 4);
        cb(null, first.address, first.family);
      });
    };

    const req = lib.request(
      u,
      {
        method: "GET",
        lookup,
        timeout: opts.timeoutMs,
        headers: {
          "user-agent": "PlantryRecipeImport/1.0 (+personal meal planning)",
          accept: "text/html,application/xhtml+xml",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ status, location: res.headers.location });
        }
        const type = String(res.headers["content-type"] ?? "");
        if (status < 200 || status >= 300) {
          res.resume();
          return resolve({ status });
        }
        if (type && !/html|xml/i.test(type)) {
          res.resume();
          return reject(badUrl("That address isn't a web page."));
        }
        const enc = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: NodeJS.ReadableStream = res;
        if (enc === "gzip") stream = res.pipe(zlib.createGunzip());
        else if (enc === "deflate") stream = res.pipe(zlib.createInflate());
        else if (enc === "br") stream = res.pipe(zlib.createBrotliDecompress());

        const chunks: Buffer[] = [];
        let size = 0;
        stream.on("data", (c: Buffer) => {
          size += c.length;
          if (size > opts.maxBytes) {
            req.destroy();
            reject(badUrl("That page is too large to import."));
            return;
          }
          chunks.push(c);
        });
        stream.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8"), contentType: type }));
        stream.on("error", () => reject(badUrl("Couldn't read that page.")));
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new AppError("That site took too long to respond.", 504, "fetch_timeout"));
    });
    req.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "EBLOCKED") return reject(badUrl("That address isn't allowed."));
      if (e.code === "ENOTFOUND" || e.code === "EAI_AGAIN") return reject(badUrl("Couldn't find that site."));
      reject(new AppError("Couldn't reach that site.", 502, "fetch_failed"));
    });
    req.end();
  });
}

/** Fetches a public web page as text. Follows a few redirects, re-checking every hop. */
export async function fetchHtml(rawUrl: string, options: FetchOptions = {}): Promise<{ html: string; finalUrl: string }> {
  const opts: Required<FetchOptions> = {
    allowPrivate: options.allowPrivate ?? false,
    maxBytes: options.maxBytes ?? MAX_BYTES,
    timeoutMs: options.timeoutMs ?? TIMEOUT_MS,
  };
  let u = parseUrl(rawUrl);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!opts.allowPrivate && net.isIP(u.hostname.replace(/^\[|\]$/g, "")) && isBlockedAddress(u.hostname.replace(/^\[|\]$/g, ""))) {
      throw badUrl("That address isn't allowed.");
    }
    const r = await oneRequest(u, opts);
    if (r.location) {
      u = parseUrl(new URL(r.location, u).toString());
      continue;
    }
    if (r.body !== undefined) return { html: r.body, finalUrl: u.toString() };
    if (r.status === 404 || r.status === 410) throw new AppError("That page wasn't found.", 422, "bad_url");
    if (r.status === 401 || r.status === 403 || r.status === 429) {
      throw new AppError("That site wouldn't let us read the page. Try copying the recipe in by hand.", 422, "fetch_refused");
    }
    throw new AppError(`That site answered with an error (${r.status}).`, 502, "fetch_failed");
  }
  throw badUrl("That address redirects too many times.");
}
