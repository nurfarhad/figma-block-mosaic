// Block Mosaic — Figma plugin controller
// This file intentionally has no build-time dependencies so it can be imported
// into Figma directly from manifest.json.

const TOOL_ID = "block-mosaic";
const DISPLAY_NAME = "Block Mosaic";
const ATTACH_KEY = `${TOOL_ID}:state`;
const DEFAULT_SIZE = 600;

const DEFAULTS = {
  cellSize: 24,
  density: 0.2,
  accentRatio: 0.2,
  seed: 42,
  bgColor: { r: 1, g: 1, b: 1, a: 1 },
  neutralColor: { r: 0.816, g: 0.816, b: 0.816, a: 1 },
  accentColor: { r: 0.878, g: 0.188, b: 0.188, a: 1 },
};

let latestParams = DEFAULTS;
let isExecuting = false;

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeColor(value, fallback) {
  if (typeof value !== "object" || value === null) return { ...fallback };
  return {
    r: clamp(finiteNumber(value.r, fallback.r), 0, 1),
    g: clamp(finiteNumber(value.g, fallback.g), 0, 1),
    b: clamp(finiteNumber(value.b, fallback.b), 0, 1),
    a: clamp(finiteNumber(value.a, fallback.a), 0, 1),
  };
}

function normalizeParams(input) {
  const value = input && typeof input === "object" ? input : {};
  return {
    cellSize: Math.round(clamp(finiteNumber(value.cellSize, DEFAULTS.cellSize), 8, 80)),
    density: clamp(finiteNumber(value.density, DEFAULTS.density), 0.02, 0.8),
    accentRatio: clamp(finiteNumber(value.accentRatio, DEFAULTS.accentRatio), 0, 1),
    seed: Math.round(clamp(finiteNumber(value.seed, DEFAULTS.seed), 0, 999)),
    bgColor: normalizeColor(value.bgColor, DEFAULTS.bgColor),
    neutralColor: normalizeColor(value.neutralColor, DEFAULTS.neutralColor),
    accentColor: normalizeColor(value.accentColor, DEFAULTS.accentColor),
  };
}

function solidPaint(color) {
  return {
    type: "SOLID",
    color: { r: color.r, g: color.g, b: color.b },
    opacity: color.a,
  };
}

function hash2d(x, y, seed) {
  let hash = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  hash = Math.imul(hash ^ (hash >>> 13), 1103515245);
  hash = Math.imul(hash ^ (hash >>> 16), 2654435769);
  return ((hash ^ (hash >>> 13)) >>> 0) / 4294967296;
}

function densityNoise(cellX, cellY, seed) {
  const scale = 0.07;
  const scaledX = cellX * scale;
  const scaledY = cellY * scale;
  const integerX = Math.floor(scaledX);
  const integerY = Math.floor(scaledY);
  const fractionX = scaledX - integerX;
  const fractionY = scaledY - integerY;
  const topLeft = hash2d(integerX, integerY, seed + 7777);
  const topRight = hash2d(integerX + 1, integerY, seed + 7777);
  const bottomLeft = hash2d(integerX, integerY + 1, seed + 7777);
  const bottomRight = hash2d(integerX + 1, integerY + 1, seed + 7777);
  const smoothX = fractionX * fractionX * (3 - 2 * fractionX);
  const smoothY = fractionY * fractionY * (3 - 2 * fractionY);

  return (
    topLeft * (1 - smoothX) * (1 - smoothY) +
    topRight * smoothX * (1 - smoothY) +
    bottomLeft * (1 - smoothX) * smoothY +
    bottomRight * smoothX * smoothY
  );
}

function generateBlocks(columns, rows, cellSize, density, accentRatio, seed) {
  const filled = Array.from({ length: columns }, () => Array(rows).fill(false));
  const blocks = [];
  const maxBlocks = 4000;

  // Place some 2×2 blocks first to introduce scale variation.
  for (let cellX = 0; cellX < columns - 1 && blocks.length < maxBlocks; cellX += 2) {
    for (let cellY = 0; cellY < rows - 1 && blocks.length < maxBlocks; cellY += 2) {
      const localDensity = densityNoise(cellX, cellY, seed);
      const threshold = density * 1.8 * localDensity;
      if (hash2d(cellX, cellY, seed + 3333) < threshold * 0.25) {
        filled[cellX][cellY] = true;
        filled[cellX + 1][cellY] = true;
        filled[cellX][cellY + 1] = true;
        filled[cellX + 1][cellY + 1] = true;
        blocks.push({
          x: cellX * cellSize,
          y: cellY * cellSize,
          width: cellSize * 2,
          height: cellSize * 2,
          isAccent: hash2d(cellX, cellY, seed + 5555) < accentRatio,
        });
      }
    }
  }

  // Fill remaining positions with single-cell blocks.
  for (let cellX = 0; cellX < columns && blocks.length < maxBlocks; cellX += 1) {
    for (let cellY = 0; cellY < rows && blocks.length < maxBlocks; cellY += 1) {
      if (filled[cellX][cellY]) continue;
      const localDensity = densityNoise(cellX, cellY, seed);
      const threshold = density * 1.5 * localDensity;
      if (hash2d(cellX, cellY, seed) < threshold) {
        filled[cellX][cellY] = true;
        blocks.push({
          x: cellX * cellSize,
          y: cellY * cellSize,
          width: cellSize,
          height: cellSize,
          isAccent: hash2d(cellX, cellY, seed + 9999) < accentRatio,
        });
      }
    }
  }

  return blocks;
}

function readAttachment(node) {
  if (!node || node.type !== "FRAME") return null;
  try {
    const parsed = JSON.parse(node.getPluginData(ATTACH_KEY));
    if (!parsed || parsed.version !== 1) return null;
    return { version: 1, params: normalizeParams(parsed.params) };
  } catch (_error) {
    return null;
  }
}

function writeAttachment(node, params) {
  node.setPluginData(ATTACH_KEY, JSON.stringify({ version: 1, params }));
  node.setRelaunchData({ [TOOL_ID]: "Adjust the pattern and colors" });
}

function selectedMosaic() {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return null;
  const node = selection[0];
  return readAttachment(node) ? node : null;
}

function placeNodeCentered(node, point) {
  node.x = point.x - node.width / 2;
  node.y = point.y - node.height / 2;
}

function buildMosaicFrame(params, width, height) {
  const frame = figma.createFrame();
  try {
    frame.name = DISPLAY_NAME;
    frame.resize(width, height);
    frame.fills = [solidPaint(params.bgColor)];
    frame.clipsContent = true;

    const cellSize = Math.max(4, params.cellSize);
    const columns = Math.ceil(width / cellSize);
    const rows = Math.ceil(height / cellSize);
    const blocks = generateBlocks(
      columns,
      rows,
      cellSize,
      params.density,
      params.accentRatio,
      params.seed,
    );

    for (const block of blocks) {
      const rectangle = figma.createRectangle();
      rectangle.name = block.isAccent ? "Accent block" : "Neutral block";
      rectangle.resize(block.width, block.height);
      rectangle.fills = [
        solidPaint(block.isAccent ? params.accentColor : params.neutralColor),
      ];
      frame.appendChild(rectangle);
      rectangle.x = block.x;
      rectangle.y = block.y;
    }

    return { frame, blockCount: blocks.length };
  } catch (error) {
    if (!frame.removed) frame.remove();
    throw error;
  }
}

function replaceMosaicContents(target, source) {
  const previousChildren = [...target.children];
  target.fills = source.fills;
  if (target.clipsContent === undefined) {
    target.clipsContent = true;
  }

  for (const child of previousChildren) child.remove();
  for (const child of [...source.children]) target.appendChild(child);
  source.remove();
}

function postSelectionState() {
  const target = selectedMosaic();
  figma.ui.postMessage({
    type: "action-state",
    busy: isExecuting,
    mode: target ? "update" : "create",
    canLiveUpdate: Boolean(target),
    buttonLabel: "Generate",
    status: target ? "Live" : "Ready",
    detail: target
      ? `${Math.round(target.width)} × ${Math.round(target.height)} selected mosaic`
      : `Creates a new ${DEFAULT_SIZE} × ${DEFAULT_SIZE} frame`,
  });
}

function refreshSelection() {
  if (isExecuting) return;
  const target = selectedMosaic();
  const attachment = target ? readAttachment(target) : null;
  if (attachment) {
    latestParams = attachment.params;
    figma.ui.postMessage({ type: "params-change", params: latestParams });
  }
  postSelectionState();
}

async function runGenerate(paramsInput, options = {}) {
  if (isExecuting) return;
  const target = selectedMosaic();
  const createIfNeeded = options.createIfNeeded !== false;
  const shouldNotify = options.notify !== false;
  if (!target && !createIfNeeded) {
    postSelectionState();
    return;
  }

  isExecuting = true;
  latestParams = normalizeParams(paramsInput);
  postSelectionState();

  let generatedFrame = null;
  try {
    const width = Math.max(1, target ? target.width : DEFAULT_SIZE);
    const height = Math.max(1, target ? target.height : DEFAULT_SIZE);
    const result = buildMosaicFrame(latestParams, width, height);
    generatedFrame = result.frame;

    let finalFrame;
    if (target) {
      replaceMosaicContents(target, generatedFrame);
      generatedFrame = null;
      finalFrame = target;
    } else {
      placeNodeCentered(generatedFrame, figma.viewport.center);
      finalFrame = generatedFrame;
      generatedFrame = null;
    }

    writeAttachment(finalFrame, latestParams);
    if (!target) {
      figma.currentPage.selection = [finalFrame];
      figma.viewport.scrollAndZoomIntoView([finalFrame]);
    }
    if (shouldNotify) {
      figma.notify(`${DISPLAY_NAME}: ${result.blockCount} blocks generated`);
    }
    figma.ui.postMessage({
      type: "generation-complete",
      blockCount: result.blockCount,
      live: !createIfNeeded,
    });
  } catch (error) {
    if (generatedFrame && !generatedFrame.removed) generatedFrame.remove();
    const message = error instanceof Error ? error.message : String(error);
    figma.notify(`Could not generate mosaic: ${message}`, { error: true });
    figma.ui.postMessage({ type: "plugin-error", message });
  } finally {
    isExecuting = false;
    postSelectionState();
  }
}

const initialTarget = selectedMosaic();
const initialAttachment = initialTarget ? readAttachment(initialTarget) : null;
latestParams = initialAttachment ? initialAttachment.params : DEFAULTS;

figma.showUI(__html__, {
  width: 340,
  height: 600,
  themeColors: true,
  title: DISPLAY_NAME,
});

figma.ui.postMessage({ type: "params-change", params: latestParams });
postSelectionState();
figma.on("selectionchange", refreshSelection);

// Serialize live rebuilds: never run two at once, and only apply the newest
// params if more arrive while one is in progress.
let liveRunning = false;
let livePending = null;
async function queueLiveUpdate(params) {
  livePending = params;
  if (liveRunning) return;
  liveRunning = true;
  try {
    while (livePending) {
      const next = livePending;
      livePending = null;
      await runGenerate(next, { createIfNeeded: false, notify: false });
    }
  } finally {
    liveRunning = false;
  }
}

figma.ui.onmessage = (message) => {
  if (!message || typeof message !== "object") return;

  if (message.type === "resize") {
    const height = Math.round(clamp(finiteNumber(message.height, 700), 360, 860));
    figma.ui.resize(340, height);
    return;
  }

  if (message.type === "generate") {
    void runGenerate(message.params);
    return;
  }

  if (message.type === "live-update") {
    queueLiveUpdate(message.params);
    return;
  }

  if (message.type === "close") {
    figma.closePlugin();
  }
};
