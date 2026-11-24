import Papa from "papaparse";
export const uid = () => crypto.randomUUID();
export const fonts = [
  "DM Sans",
  "Manrope",
  "Georgia",
  "Arial",
  "Verdana",
  "Courier New",
];
export const defaultStyle = {
  background: "#ffffff",
  color: "#293141",
  borderColor: "#dcdfe5",
  borderWidth: 1,
  radius: 12,
  fontFamily: "DM Sans",
  fontSize: 16,
  padding: 24,
  opacity: 1,
};
export function safeUrl(value) {
  try {
    const url = new URL(String(value).trim());
    return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}
export function blankBoard(name = "Untitled project") {
  return {
    version: 2,
    name,
    groups: [],
    blocks: [],
    edges: [],
    csvFiles: [],
    views: [{ id: "view-1", name: "View 1" }],
    startViewId: "view-1",
  };
}
export function newBlock(type, x = 100, y = 100) {
  let b = {
    id: uid(),
    type,
    name:
      {
        text: "Text block",
        table: "Untitled table",
        tabs: "Tabbed content",
        button: "Link button",
        report: "Report",
      }[type] || "Block",
    x,
    y,
    w: type === "table" ? 520 : type === "report" ? 450 : 340,
    h:
      type === "report"
        ? 360
        : type === "text"
          ? 320
          : type === "table"
            ? 300
            : type === "button"
              ? 170
              : 280,
    groupId: "",
    style: { ...defaultStyle },
  };
  if (type === "text")
    b.html = "<h2>A new idea.</h2><p>Start writing. Make it your own.</p>";
  if (type === "table")
    b.table = {
      columns: [
        { id: uid(), name: "Category" },
        { id: uid(), name: "Value" },
      ],
      rows: [
        ["Organic", "120"],
        ["Direct", "80"],
        ["Social", "60"],
      ],
    };
  if (type === "tabs")
    ((b.tabs = [
      {
        id: uid(),
        name: "Overview",
        html: "<h3>The big picture</h3><p>Collect your thoughts here.</p>",
      },
      { id: uid(), name: "Details", html: "<p>Make room for the details.</p>" },
    ]),
      (b.activeTab = b.tabs[0].id));
  if (type === "button")
    b.link = {
      label: "Explore more",
      url: "https://example.com",
      newTab: true,
    };
  if (type === "report")
    b.report = {
      tableId: "",
      kind: "pie",
      labelColumn: "",
      valueColumn: "",
      bins: 6,
    };
  if (type === "image") {
    b.name = "Image";
    b.image = { src: "", alt: "", fit: "contain" };
    b.w = 420;
    b.h = 350;
  }
  if (type === "section") {
    b.name = "Section";
    b.w = 900;
    b.h = 600;
    b.style.background = "#edf3ff";
  }
  if (type === "kanban") {
    b.name = "K board";
    b.w = 920;
    b.h = 460;
    b.kanban = {
      columns: ["To do", "In progress", "Done"].map((name) => ({
        id: uid(),
        name,
      })),
      cards: [],
    };
  }
  return b;
}
export function sampleBoard(name = "Product launch") {
  const a = newBlock("text", 65, 115),
    b = newBlock("table", 470, 130),
    c = newBlock("tabs", 65, 500),
    d = newBlock("report", 470, 500);
  a.name = "The big picture";
  a.html =
    "<h2>Good ideas deserve<br>a little space.</h2><p>Bring your thinking, your data, and your story together.</p><ul><li>Gather the pieces</li><li>Connect what matters</li><li>Share the bigger picture</li></ul>";
  a.style.background = "#e9edf5";
  b.name = "Launch performance";
  b.table = {
    columns: [
      { id: uid(), name: "Channel" },
      { id: uid(), name: "Visitors" },
      { id: uid(), name: "Sign-ups" },
    ],
    rows: [
      ["Organic", "12480", "1860"],
      ["Direct", "8240", "1240"],
      ["Social", "6180", "742"],
      ["Email", "3920", "864"],
    ],
  };
  c.name = "A plan, taking shape";
  d.name = "Where visitors come from";
  d.report = {
    tableId: b.id,
    kind: "pie",
    labelColumn: b.table.columns[0].id,
    valueColumn: b.table.columns[1].id,
    bins: 6,
  };
  return {
    ...blankBoard(name),
    blocks: [a, b, c, d],
    edges: [
      {
        id: uid(),
        from: a.id,
        to: b.id,
        color: "#76829a",
        width: 2,
        dash: "solid",
        startArrow: false,
        endArrow: true,
        curve: true,
      },
      {
        id: uid(),
        from: b.id,
        to: d.id,
        color: "#76829a",
        width: 2,
        dash: "dashed",
        startArrow: false,
        endArrow: true,
        curve: true,
      },
    ],
  };
}
export function parseCSV(text) {
  if (!text.trim()) throw Error("This CSV is empty.");
  const result = Papa.parse(text.replace(/^\uFEFF/, ""), {
    delimiter: ",",
    skipEmptyLines: "greedy",
  });
  if (result.errors.length)
    throw Error("CSV could not be read: " + result.errors[0].message);
  const rows = result.data;
  if (!rows.length || !rows[0].length) throw Error("This CSV is empty.");
  if (rows.length > 1001)
    throw Error("Please use up to 1,000 data rows per table.");
  const width = Math.max(...rows.map((r) => r.length));
  if (width > 50) throw Error("Please use up to 50 columns per table.");
  return {
    columns: Array.from({ length: width }, (_, i) => ({
      id: uid(),
      name: String(rows[0][i] || `Column ${i + 1}`),
    })),
    rows: rows
      .slice(1)
      .map((r) => Array.from({ length: width }, (_, i) => String(r[i] ?? ""))),
  };
}
export function deleteColumn(table, id) {
  const index = table.columns.findIndex((c) => c.id === id);
  if (index < 0 || table.columns.length <= 1) return table;
  return {
    columns: table.columns.filter((c) => c.id !== id),
    rows: table.rows.map((r) => r.filter((_, i) => i !== index)),
  };
}
export function ownedBlockIds(board, id) {
  const ids = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const b of board.blocks) {
      const tabParent = board.blocks.find((x) => x.id === b.tabParentId),
        sectionParent = board.blocks.find((x) => x.id === b.parentId);
      if (
        (tabParent && ids.has(tabParent.id)) ||
        (sectionParent && ids.has(sectionParent.id))
      ) {
        if (!ids.has(b.id)) {
          ids.add(b.id);
          grew = true;
        }
      }
    }
  }
  return ids;
}
export function deleteBlock(board, id) {
  const original = board.blocks.find((b) => b.id === id);
  const ids =
    original?.type === "tabs" ? ownedBlockIds(board, id) : new Set([id]);
  return {
    ...board,
    blocks: board.blocks
      .filter((b) => !ids.has(b.id))
      .map((b) => (b.parentId === id ? { ...b, parentId: "" } : b)),
    edges: board.edges.filter((e) => !ids.has(e.from) && !ids.has(e.to)),
  };
}
export function duplicateBlock(board, id) {
  const original = board.blocks.find((b) => b.id === id);
  if (!original) return board;
  const owned = ownedBlockIds(board, id),
    map = new Map([...owned].map((id) => [id, uid()]));
  const copies = board.blocks
    .filter((b) => owned.has(b.id))
    .map((b) => {
      const c = structuredClone(b);
      c.id = map.get(b.id);
      if (b.id === id) c.name += " copy";
      c.hidden = false;
      if (!map.has(b.tabParentId)) {
        c.x += 35;
        c.y += 35;
      }
      if (map.has(b.parentId)) c.parentId = map.get(b.parentId);
      if (map.has(b.tabParentId)) c.tabParentId = map.get(b.tabParentId);
      if (c.report?.tableId && map.has(c.report.tableId))
        c.report.tableId = map.get(c.report.tableId);
      if (c.report?.kanbanId && map.has(c.report.kanbanId))
        c.report.kanbanId = map.get(c.report.kanbanId);
      if (c.link?.targetTabBlockId && map.has(c.link.targetTabBlockId))
        c.link.targetTabBlockId = map.get(c.link.targetTabBlockId);
      return c;
    });
  return {
    ...board,
    blocks: [...board.blocks, ...copies],
    edges: [
      ...board.edges,
      ...board.edges
        .filter((e) => owned.has(e.from) && owned.has(e.to))
        .map((e) => ({
          ...e,
          id: uid(),
          from: map.get(e.from),
          to: map.get(e.to),
        })),
    ],
  };
}
export function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const t = String(value ?? "")
    .trim()
    .replace(/[,\s$€£₹%]/g, "");
  if (!t || !/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
export function reportData(block, blocks) {
  if (block.report?.sourceType === "kanban") {
    const source = blocks.find(
      (b) => b.id === block.report.kanbanId && b.type === "kanban",
    );
    if (!source) return { data: [], reason: "Choose a K board in Properties." };
    const data = source.kanban.columns.map((c) => ({
      name: c.name,
      value: source.kanban.cards.filter((x) => x.columnId === c.id).length,
    }));
    return {
      data: data.some((x) => x.value) ? data : [],
      source: source.name,
      unit: "Cards per column",
      reason: "Add cards to the source K board to see this report.",
    };
  }

  const source = blocks.find(
    (b) => b.id === block.report?.tableId && b.type === "table",
  );
  if (!source)
    return { data: [], reason: "Choose a table to build your report." };
  const { columns, rows } = source.table,
    r = block.report,
    vi = columns.findIndex((c) => c.id === r.valueColumn),
    li = columns.findIndex((c) => c.id === r.labelColumn);
  if (vi < 0)
    return { data: [], reason: "Choose a numeric column in Properties." };
  let skipped = 0;
  if (r.kind === "histogram") {
    const values = rows
      .map((row) => numeric(row[vi]))
      .filter((n) => {
        if (n === null) skipped++;
        return n !== null;
      });
    if (!values.length)
      return { data: [], reason: "This column has no numeric values." };
    const min = Math.min(...values),
      max = Math.max(...values),
      count = Math.max(2, Math.min(20, +r.bins || 6)),
      step = max === min ? 1 : (max - min) / count;
    const bins = Array.from({ length: max === min ? 1 : count }, (_, i) => ({
      name:
        max === min
          ? String(min)
          : `${formatNumber(min + i * step)}–${formatNumber(min + (i + 1) * step)}`,
      value: 0,
      low: min + i * step,
      high: min + (i + 1) * step,
    }));
    for (const v of values)
      bins[Math.min(bins.length - 1, Math.floor((v - min) / step))].value++;
    return { data: bins, skipped, source: source.name, unit: "Frequency" };
  }
  if (li < 0)
    return { data: [], reason: "Choose a label column in Properties." };
  const totals = new Map();
  for (const row of rows) {
    const value = numeric(row[vi]);
    if (value === null || (r.kind === "pie" && value <= 0)) {
      skipped++;
      continue;
    }
    const label = String(row[li] || "Untitled");
    totals.set(label, (totals.get(label) || 0) + value);
  }
  let data = [...totals].map(([name, value]) => ({ name, value }));
  if (r.kind === "pie" && data.length > 10) {
    data.sort((a, b) => b.value - a.value);
    data = [
      ...data.slice(0, 9),
      { name: "Other", value: data.slice(9).reduce((s, d) => s + d.value, 0) },
    ];
  }
  return {
    data,
    skipped,
    source: source.name,
    unit: columns[vi].name,
    reason: data.length ? "" : "No usable numeric data in the selected column.",
  };
}
export function formatNumber(n) {
  return Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: Math.abs(n) >= 100000 ? "compact" : "standard",
  }).format(n);
}
export function boardBytes(board) {
  return new TextEncoder().encode(JSON.stringify(board)).length;
}
export function publishSnapshot(board) {
  const { csvFiles, imageFiles, ...snapshot } = structuredClone(board);
  return {
    ...snapshot,
    blocks: board.blocks.map((b) => {
      const { csv, ...clean } = structuredClone(b);
      if (clean.image) {
        const { path, ...image } = clean.image;
        clean.image = image;
      }
      return clean;
    }),
  };
}
export function readableError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use":
      "An account already exists for this email. Please sign in.",
    "auth/weak-password": "Use a stronger password with at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests":
      "Too many attempts. Please wait before trying again.",
    "auth/operation-not-allowed":
      "Email/password sign-in is not enabled in Firebase yet.",
    "auth/configuration-not-found":
      "Firebase Authentication needs to be enabled for this project.",
    "auth/unauthorized-domain":
      "Add this website domain to Firebase Authentication’s authorized domains.",
    "auth/network-request-failed":
      "Could not connect. Check your internet connection.",
    "permission-denied":
      "Access was denied. Check that the supplied Firestore security rules are deployed.",
    "storage/unauthorized":
      "File access was denied. Check the Firebase Storage rules.",
    "storage/bucket-not-found":
      "Create the Firebase Storage bucket to enable CSV uploads.",
    "storage/unknown":
      "CSV storage failed. Check Firebase Storage setup, billing, and CORS.",
    unavailable:
      "Firebase is unavailable. Your changes are kept locally until you retry.",
  };
  return (
    map[code] || error?.message || "Something went wrong. Please try again."
  );
}

export function safeImageUrl(value) {
  const text = String(value || "").trim();
  if (/^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(text))
    return text;
  try {
    const u = new URL(text);
    return ["https:", "http:"].includes(u.protocol) ? u.href : "";
  } catch {
    return "";
  }
}
export function moveCard(kanban, id, columnId) {
  if (!kanban.columns.some((c) => c.id === columnId)) return kanban;
  return {
    ...kanban,
    cards: kanban.cards.map((c) => (c.id === id ? { ...c, columnId } : c)),
  };
}
export function isBlockVisible(block, blocks) {
  if (block.hidden) return false;
  const p = blocks.find((b) => b.id === block.parentId && b.type === "section");
  return !p || !p.hidden;
}
export function updateBoardBlock(board, id, patch) {
  const old = board.blocks.find((b) => b.id === id);
  if (!old) return board;
  if (old.type === "tabs" && patch.tabs) {
    const keep = new Set(patch.tabs.map((t) => t.id)),
      removed = new Set();
    for (const child of board.blocks.filter(
      (b) => b.tabParentId === id && !keep.has(b.tabId),
    ))
      for (const key of ownedBlockIds(board, child.id)) removed.add(key);
    board = {
      ...board,
      blocks: board.blocks.filter((b) => !removed.has(b.id)),
      edges: board.edges.filter(
        (e) => !removed.has(e.from) && !removed.has(e.to),
      ),
    };
  }
  const dx = (patch.x ?? old.x) - old.x,
    dy = (patch.y ?? old.y) - old.y;
  return {
    ...board,
    blocks: board.blocks.map((b) =>
      b.id === id
        ? { ...b, ...patch }
        : old.type === "section" && b.parentId === id
          ? { ...b, x: b.x + dx, y: b.y + dy }
          : b,
    ),
  };
}
export function relocateLayer(
  board,
  id,
  {
    parentId = "",
    groupId = "",
    beforeId = null,
    tabParentId = "",
    tabId = "",
  } = {},
) {
  const b = board.blocks.find((x) => x.id === id);
  if (
    !b ||
    beforeId === id ||
    parentId === id ||
    (b.type === "section" && parentId)
  )
    return board;
  if (
    parentId &&
    !board.blocks.some((x) => x.id === parentId && x.type === "section")
  )
    return board;
  if (groupId && !board.groups.some((x) => x.id === groupId)) return board;
  if (
    tabParentId &&
    !board.blocks.some(
      (b) =>
        b.id === tabParentId &&
        b.type === "tabs" &&
        b.tabs.some((t) => t.id === tabId),
    )
  )
    return board;
  if (tabParentId === id) return board;
  let ancestor = board.blocks.find((x) => x.id === tabParentId);
  const seen = new Set();
  while (ancestor && !seen.has(ancestor.id)) {
    if (ancestor.id === id) return board;
    seen.add(ancestor.id);
    ancestor = board.blocks.find((x) => x.id === ancestor.tabParentId);
  }
  const moved = {
      ...b,
      parentId,
      groupId: parentId ? "" : groupId,
      tabParentId,
      tabId,
    },
    blocks = board.blocks.filter((x) => x.id !== id),
    index = beforeId ? blocks.findIndex((x) => x.id === beforeId) : -1;
  if (tabParentId && tabParentId !== b.tabParentId) {
    moved.x = 20;
    moved.y = 20;
  }
  blocks.splice(index < 0 ? blocks.length : index, 0, moved);
  return {
    ...board,
    blocks: blocks.map((x) =>
      x.id === tabParentId
        ? {
            ...x,
            w: Math.max(x.w, 680),
            h: Math.max(x.h, 530),
            activeTab: tabId,
            tabs: x.tabs.map((t) =>
              t.id === tabId ? { ...t, viewId: "", contentType: "blocks" } : t,
            ),
          }
        : x,
    ),
  };
}

export function projectViews(board) {
  return board.views?.length ? board.views : [{ id: "view-1", name: "View 1" }];
}
export function viewBlocks(board, viewId) {
  const first = projectViews(board)[0].id;
  return board.blocks.filter((b) => {
    let owner = b;
    const seen = new Set();
    while (owner.tabParentId && !seen.has(owner.id)) {
      seen.add(owner.id);
      const parent = board.blocks.find((p) => p.id === owner.tabParentId);
      if (!parent) break;
      owner = parent;
    }
    return (
      isBlockVisible(b, board.blocks) &&
      (owner.viewId === "*" || (owner.viewId || first) === viewId)
    );
  });
}

export function presentationTabSource(board) {
  return board.blocks.find(
    (b) =>
      b.type === "tabs" &&
      b.tabs.some((t) => projectViews(board).some((v) => v.id === t.viewId)),
  );
}
export function presentationTabs(board) {
  return projectViews(board).map((v) => ({ ...v, viewId: v.id }));
}
export function startingView(board) {
  return board.startViewId || projectViews(board)[0].id;
}
