"use strict";
// Comparison loaders may tolerate formatting, but never a missing/ambiguous rule.
module.exports = function replaceSource(source, from, to, label = "Trial source contract") {
  if (source.includes(from)) return source.replace(from, to);
  const tokens = from.trim().match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g);
  const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escaped.join("\\s*"), "g");
  const matches = [...source.matchAll(pattern)];
  if (matches.length !== 1) throw Error(label + ": missing or ambiguous rule " + from.slice(0, 70));
  const m = matches[0];
  return source.slice(0, m.index) + to.trim() + source.slice(m.index + m[0].length);
};
