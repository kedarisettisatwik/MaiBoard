import React, { useState } from "react";
import { reportData, formatNumber } from "./model";
import { Icon } from "./ui";
const colors = [
  "#28447b",
  "#7787a7",
  "#a7b4ce",
  "#8ca7db",
  "#8cadd0",
  "#c59daa",
  "#9e90bc",
  "#d49a73",
  "#727f97",
  "#c1b8a7",
];
export default function Report({ block, blocks }) {
  const result = reportData(block, blocks),
    [hover, setHover] = useState(null);
  const { data } = result;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!data.length)
    return (
      <div className="report-empty">
        <Icon name="BarChart3" size={36} />
        <strong>A little perspective on your data.</strong>
        <p>{result.reason}</p>
      </div>
    );
  const kind = block.report.kind;
  let offset = 0;
  const max = Math.max(...data.map((d) => d.value), 0),
    min = Math.min(...data.map((d) => d.value), 0),
    range = Math.max(1, max - min);
  return (
    <div className="report-content">
      <div className="chart-source">
        <span className="live-tag">Live report</span>
        <span>{result.unit}</span>
      </div>
      {kind === "pie" ? (
        <div className="pie-wrap">
          <svg
            viewBox="0 0 200 200"
            role="img"
            aria-label={`Pie chart: ${data.map((d) => `${d.name}: ${d.value}`).join(", ")}`}
          >
            <circle
              cx="100"
              cy="100"
              r="70"
              fill="none"
              stroke="#eff1f4"
              strokeWidth="34"
            />
            {data.map((d, i) => {
              const length = (d.value / total) * 439.823,
                start = offset;
              offset += length;
              return (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth={hover === i ? 39 : 34}
                  strokeDasharray={`${Math.max(0, length - 0.9)} ${439.823 - length + 0.9}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 100 100)"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                >
                  <title>
                    {d.name}: {formatNumber(d.value)} (
                    {((d.value / total) * 100).toFixed(1)}%)
                  </title>
                </circle>
              );
            })}
            <text x="100" y="97" textAnchor="middle" className="chart-total">
              {formatNumber(hover === null ? total : data[hover].value)}
            </text>
            <text x="100" y="118" textAnchor="middle" className="chart-sub">
              {hover === null
                ? "Total"
                : ((data[hover].value / total) * 100).toFixed(1) + "%"}
            </text>
          </svg>
          <div className="chart-legend">
            {data.map((d, i) => (
              <div
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <span style={{ background: colors[i % colors.length] }} />
                <span title={d.name}>{d.name}</span>
                <strong>{((d.value / total) * 100).toFixed(0)}%</strong>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="bar-chart"
          role="img"
          aria-label={`${kind === "histogram" ? "Histogram" : "Bar chart"}: ${data.map((d) => `${d.name}: ${d.value}`).join(", ")}`}
        >
          <div className="chart-scale">
            <span>{formatNumber(max)}</span>
            <span>{formatNumber((max + min) / 2)}</span>
            <span>{formatNumber(min)}</span>
          </div>
          <div
            className={`bar-columns ${kind === "histogram" ? "histogram" : ""}`}
          >
            {data.map((d, i) => (
              <div className="bar-column" key={i}>
                <div className="bar-track">
                  <div
                    style={{
                      position: "absolute",
                      top: `${((max - Math.max(d.value, 0)) / range) * 100}%`,
                      height: `${Math.max(0.5, (Math.abs(d.value) / range) * 100)}%`,
                      background: colors[i % colors.length],
                    }}
                    title={`${d.name}: ${formatNumber(d.value)}`}
                  >
                    <span>{formatNumber(d.value)}</span>
                  </div>
                </div>
                <span title={d.name}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="report-foot">
        <span>From {result.source}</span>
        {result.skipped > 0 && (
          <span>
            {result.skipped} invalid {kind === "pie" ? "or non-positive " : ""}
            values omitted
          </span>
        )}
      </div>
    </div>
  );
}
