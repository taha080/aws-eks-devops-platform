const assert = require("node:assert/strict");
const lf = require("./engine.js");

function alphabetIndex(chars) {
  let i = 0;
  return () => lfAlphabet(chars[i++]);
}

function lfAlphabet(char) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const index = alphabet.indexOf(char);
  if (index < 0) throw new Error(`bad char ${char}`);
  return index;
}

assert.equal(lf.normalizeTarget("").ok, false);
assert.equal(lf.normalizeTarget("javascript:alert(1)").ok, false);
assert.equal(lf.normalizeTarget("data:text/html,hi").ok, false);
assert.equal(lf.normalizeTarget("example.com").ok, false);
assert.deepEqual(lf.normalizeTarget("https://example.com/docs"), {
  ok: true,
  url: "https://example.com/docs",
});
assert.equal(lf.normalizeTarget(`https://example.com/${"a".repeat(2100)}`).ok, false);
assert.equal(lf.safeHttpUrl("https://example.com/a"), true);
assert.equal(lf.safeHttpUrl("javascript:alert(1)"), false);

assert.deepEqual(lf.normalizeCode(""), { ok: true, code: "" });
assert.deepEqual(lf.normalizeCode("abc"), { ok: true, code: "abc" });
assert.equal(lf.normalizeCode("ab").ok, false);
assert.equal(lf.normalizeCode("has space").ok, false);
assert.equal(lf.normalizeCode("metrics").ok, false);
assert.equal(lf.normalizeCode("Docs").ok, false);
assert.equal(lf.isReserved("OpenAPI"), true);
assert.equal(lf.isValidCode("ab"), false);
assert.equal(lf.isValidCode("a_b-1"), true);

assert.equal(lf.normalizeBase("").ok, false);
assert.equal(lf.normalizeBase("ftp://example.com").ok, false);
assert.equal(lf.normalizeBase("http://user:secret@example.com").ok, false);
assert.deepEqual(lf.normalizeBase("http://127.0.0.1:8000/"), {
  ok: true,
  url: "http://127.0.0.1:8000",
});
assert.deepEqual(lf.normalizeBase("https://links.example.com/base/"), {
  ok: true,
  url: "https://links.example.com/base",
});

assert.equal(
  lf.pageBaseFrom("https://taha080.github.io/aws-eks-devops-platform/index.html?api=1#/abc1234"),
  "https://taha080.github.io/aws-eks-devops-platform/",
);
assert.equal(
  lf.pageBaseFrom("https://taha080.github.io/aws-eks-devops-platform"),
  "https://taha080.github.io/aws-eks-devops-platform/",
);
assert.equal(
  lf.shortHashUrl("https://taha080.github.io/aws-eks-devops-platform/", "abc1234"),
  "https://taha080.github.io/aws-eks-devops-platform/#/abc1234",
);

assert.equal(lf.parseHash("#/abc1234"), "abc1234");
assert.equal(lf.parseHash("#/ab"), null);
assert.equal(lf.parseHash("#demo"), null);
assert.equal(lf.parseHash("#/has space"), null);
assert.equal(lf.parseHash(""), null);

assert.equal(lf.plural(1, "link"), "1 link");
assert.equal(lf.plural(2, "click"), "2 clicks");
assert.equal(lf.plural(0, "link"), "0 links");

assert.match(lf.describeApiError(0, null), /Could not reach the API/);
assert.equal(lf.describeApiError(401, { detail: "unauthorized" }), "The API refused that token.");
assert.equal(lf.describeApiError(409, null), "That code already exists.");
assert.equal(lf.describeApiError(422, { detail: [{ msg: "bad" }] }), "The API rejected that URL or code.");

const skipped = lf.generateCode(new Set(), alphabetIndex("metricsABCDEFG"));
assert.equal(skipped, "ABCDEFG");
const collided = lf.generateCode(new Set(["taken00"]), alphabetIndex("taken00fresh01"));
assert.equal(collided, "fresh01");
const random = lf.generateCode(new Set(["taken00"]));
assert.equal(random.length, 7);
assert.equal(lf.isValidCode(random), true);
assert.notEqual(random, "taken00");

console.log("engine tests passed");
