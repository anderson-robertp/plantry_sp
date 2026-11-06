import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";
import { fetchHtml, isBlockedAddress } from "./safeFetch.js";

describe("isBlockedAddress", () => {
  it("blocks private, loopback, link-local and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "224.0.0.1"]) {
      expect([ip, isBlockedAddress(ip)]).toEqual([ip, true]);
    }
  });
  it("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111"]) {
      expect([ip, isBlockedAddress(ip)]).toEqual([ip, false]);
    }
  });
});

describe("fetchHtml refuses bad targets", () => {
  it("rejects bad schemes and private literals before any network call", async () => {
    await expect(fetchHtml("file:///etc/passwd")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("ftp://example.com/x")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("not a url")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("http://user:pw@example.com/")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("http://127.0.0.1:9/")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("http://169.254.169.254/latest/meta-data")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("http://[::1]/")).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml("http://localhost:9/")).rejects.toMatchObject({ code: "bad_url" });
  });
});

describe("fetchHtml against a local server", () => {
  let server: http.Server;
  let base = "";
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === "/ok") {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end("<html>hello</html>");
      } else if (req.url === "/gz") {
        res.setHeader("content-type", "text/html");
        res.setHeader("content-encoding", "gzip");
        res.end(zlib.gzipSync("<html>zipped</html>"));
      } else if (req.url === "/redir") {
        res.statusCode = 302;
        res.setHeader("location", "/ok");
        res.end();
      } else if (req.url === "/loop") {
        res.statusCode = 302;
        res.setHeader("location", "/loop");
        res.end();
      } else if (req.url === "/big") {
        res.setHeader("content-type", "text/html");
        res.end("x".repeat(5000));
      } else if (req.url === "/json") {
        res.setHeader("content-type", "application/json");
        res.end("{}");
      } else if (req.url === "/slow") {
        // never answers
      } else if (req.url === "/forbidden") {
        res.statusCode = 403;
        res.end();
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => {
    server.closeAllConnections();
    server.close();
  });

  const o = { allowPrivate: true };
  it("returns the page, follows redirects and decompresses", async () => {
    expect((await fetchHtml(`${base}/ok`, o)).html).toBe("<html>hello</html>");
    expect((await fetchHtml(`${base}/redir`, o)).finalUrl).toBe(`${base}/ok`);
    expect((await fetchHtml(`${base}/gz`, o)).html).toBe("<html>zipped</html>");
  });
  it("stops redirect loops, oversize pages, non-pages, slow sites and refusals", async () => {
    await expect(fetchHtml(`${base}/loop`, o)).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml(`${base}/big`, { ...o, maxBytes: 1000 })).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml(`${base}/json`, o)).rejects.toMatchObject({ code: "bad_url" });
    await expect(fetchHtml(`${base}/slow`, { ...o, timeoutMs: 200 })).rejects.toMatchObject({ code: "fetch_timeout" });
    await expect(fetchHtml(`${base}/forbidden`, o)).rejects.toMatchObject({ code: "fetch_refused" });
    await expect(fetchHtml(`${base}/nope`, o)).rejects.toMatchObject({ code: "bad_url" });
  });
});
