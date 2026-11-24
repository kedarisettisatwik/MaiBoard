export const chartPalettes = {
  Blue: ['#2563eb','#60a5fa','#1e40af','#93c5fd','#0284c7','#38bdf8'],
  Vibrant: ['#2563eb','#f97316','#14b8a6','#a855f7','#ec4899','#eab308'],
  Earth: ['#477766','#b88746','#798645','#c57563','#6c7e99','#a897bc'],
};
export function chartColor(report, name, index) {
  const custom = report.colors?.[name];
  const palette = chartPalettes[report.palette] || chartPalettes.Blue;
  return /^#[\da-f]{6}$/i.test(custom || '') ? custom : palette[index % palette.length];
}
