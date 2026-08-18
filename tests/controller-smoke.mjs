import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

class MockNode {
  constructor(type) {
    this.type = type;
    this.name = type;
    this.x = 0;
    this.y = 0;
    this.width = 100;
    this.height = 100;
    this.children = [];
    this.parent = null;
    this.removed = false;
    this.fills = [];
    this.pluginData = new Map();
    this.relaunchData = {};
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  appendChild(child) {
    if (child.parent) {
      child.parent.children = child.parent.children.filter((node) => node !== child);
    }
    this.children.push(child);
    child.parent = this;
  }

  remove() {
    this.removed = true;
    if (this.parent) {
      this.parent.children = this.parent.children.filter((node) => node !== this);
      this.parent = null;
    }
  }

  getPluginData(key) {
    return this.pluginData.get(key) || "";
  }

  setPluginData(key, value) {
    this.pluginData.set(key, String(value));
  }

  setRelaunchData(value) {
    this.relaunchData = value;
  }
}

const page = new MockNode("PAGE");
page.selection = [];

const messages = [];
const notifications = [];
const events = new Map();

const figma = {
  currentPage: page,
  viewport: {
    center: { x: 500, y: 400 },
    scrollAndZoomIntoView() {},
  },
  ui: {
    onmessage: null,
    postMessage(message) { messages.push(message); },
    resize() {},
  },
  showUI() {},
  notify(message) { notifications.push(message); },
  on(name, callback) { events.set(name, callback); },
  createFrame() {
    const node = new MockNode("FRAME");
    page.appendChild(node);
    return node;
  },
  createRectangle() {
    const node = new MockNode("RECTANGLE");
    page.appendChild(node);
    return node;
  },
};

const controller = await readFile(new URL("../code.js", import.meta.url), "utf8");
vm.runInNewContext(controller, {
  figma,
  __html__: "<html></html>",
  console,
  Error,
  JSON,
  Math,
  Number,
  Object,
  Array,
  Set,
  String,
  Promise,
});

async function generate(params = {}) {
  figma.ui.onmessage({
    type: "generate",
    params: {
      cellSize: 24,
      density: 0.2,
      accentRatio: 0.2,
      seed: 42,
      bgColor: { r: 1, g: 1, b: 1, a: 1 },
      neutralColor: { r: 0.8, g: 0.8, b: 0.8, a: 1 },
      accentColor: { r: 0.9, g: 0.2, b: 0.2, a: 1 },
      ...params,
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
}

await generate();
assert.equal(page.selection.length, 1, "generation should select one result");
const firstMosaic = page.selection[0];
assert.equal(firstMosaic.type, "FRAME");
assert.equal(firstMosaic.width, 600);
assert.equal(firstMosaic.height, 600);
assert.ok(firstMosaic.children.length > 0, "mosaic should contain rectangles");
assert.ok(firstMosaic.getPluginData("block-mosaic:state"), "mosaic should retain editable parameters");
assert.equal(firstMosaic.relaunchData["block-mosaic"], "Adjust the pattern and colors");

const originalBlockCount = firstMosaic.children.length;
const notificationCountBeforeLiveUpdate = notifications.length;
figma.ui.onmessage({
  type: "live-update",
  params: {
    cellSize: 24,
    density: 0.55,
    accentRatio: 0.35,
    seed: 512,
    bgColor: { r: 1, g: 1, b: 1, a: 0.9 },
    neutralColor: { r: 0.7, g: 0.7, b: 0.7, a: 1 },
    accentColor: { r: 0.9, g: 0.2, b: 0.2, a: 0.8 },
  },
});
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(page.selection[0], firstMosaic, "live updates should retain the mosaic frame");
assert.equal(notifications.length, notificationCountBeforeLiveUpdate, "live updates should stay quiet");
assert.equal(
  JSON.parse(firstMosaic.getPluginData("block-mosaic:state")).params.seed,
  512,
  "live updates should save the randomized seed",
);

firstMosaic.resize(720, 480);
await generate({ seed: 777, density: 0.4 });
assert.equal(page.selection[0], firstMosaic, "updating should retain the selected mosaic frame");
assert.equal(firstMosaic.width, 720, "updating should retain a manually changed width");
assert.equal(firstMosaic.height, 480, "updating should retain a manually changed height");
assert.notEqual(firstMosaic.children.length, originalBlockCount, "updated settings should regenerate blocks");

const ordinaryFrame = figma.createFrame();
const ordinaryChild = figma.createRectangle();
ordinaryFrame.appendChild(ordinaryChild);
page.selection = [ordinaryFrame];
await generate({ seed: 8 });
assert.equal(ordinaryFrame.children.length, 1, "ordinary selected frames must remain untouched");
assert.notEqual(page.selection[0], ordinaryFrame, "ordinary selection should create a separate mosaic");

assert.ok(notifications.length >= 3, "successful generations should notify the user");
assert.ok(messages.some((message) => message.type === "action-state"));
assert.ok(messages.some((message) => message.type === "generation-complete" && message.live));
console.log("Figma controller smoke test passed.");
