import { createHideRules } from "virtual:original-rules";
import { frameInput, animate } from "./input.js";
import bibleUrl from "../../../../Beyond the wall/assets/main/images/bible.webp";
import hammerUrl from "../../../../Beyond the wall/assets/main/images/hammer.webp";

export function mountHide(root, { onComplete }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  canvas.tabIndex = 0;
  canvas.className = "original-hide-canvas";
  canvas.setAttribute(
    "aria-label",
    "把右侧石锤拖入左侧圣经；空格拿起，字母键移动，空格放下",
  );
  root.replaceChildren(canvas);
  const ctx = canvas.getContext("2d"),
    input = frameInput(root, canvas);
  const images = {};
  for (const [key, url] of Object.entries({
    bible: bibleUrl,
    hammer: hammerUrl,
  })) {
    images[key] = new Image();
    images[key].src = url;
  }
  const rules = createHideRules({
    input,
    onComplete,
    renderPanel(c, x, y, w, h) {
      c.fillStyle = "#171c19";
      c.fillRect(x, y, w, h);
      c.strokeStyle = "#b5a16b";
      c.lineWidth = 3;
      c.strokeRect(x, y, w, h);
    },
    drawAssetContainInBounds(c, key, r) {
      const img = images[key];
      if (!img.complete || !img.naturalWidth) return;
      const scale = Math.min(r.w / img.naturalWidth, r.h / img.naturalHeight),
        w = img.naturalWidth * scale,
        h = img.naturalHeight * scale;
      c.drawImage(img, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
    },
  });
  const stop = animate(() => {
    rules.update();
    input.endFrame();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rules.draw(ctx);
  });
  canvas.focus();
  return {
    getState: rules.getState,
    destroy() {
      stop();
      input.destroy();
    },
  };
}
