import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const originalRoot = fileURLToPath(
  new URL("../../../Beyond the wall/", import.meta.url),
);
export const readOriginal = (path) => readFileSync(originalRoot + path, "utf8");

// 构建时截取原版具名函数，原文件调整后找不到边界就停止构建，避免悄悄换规则。
export function originalFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error("原版函数不存在：" + name);
  const indent = source.slice(source.lastIndexOf("\n", start) + 1, start);
  const end = source.indexOf("\n" + indent + "}", start);
  if (end < 0) throw new Error("原版函数边界不存在：" + name);
  return source.slice(start, end + indent.length + 2).trim();
}

export function originalBlock(source, from, to) {
  const start = source.indexOf(from),
    end = source.indexOf(to, start + from.length);
  if (start < 0 || end < 0) throw new Error("原版代码边界不存在：" + from);
  return source.slice(start, end).trim();
}

export function originalConstant(source, name) {
  const match = source.match(new RegExp(`const ${name} = [^;]+;`));
  if (!match) throw new Error("原版常量不存在：" + name);
  return match[0];
}

// 只改资源地址。玩法源码直接进入构建，资源由打包器收集并校验。
export function routeOriginalAssets(source) {
  const imports = [],
    urls = new Map();
  const asset = (path) => {
    if (!urls.has(path)) {
      const name = `originalAsset${urls.size}`;
      urls.set(path, name);
      imports.push(
        `import ${name} from ${JSON.stringify(originalRoot + path.slice(3))};`,
      );
    }
    return urls.get(path);
  };
  const result = source
    .replace(/(["'])(\.\.\/assets\/[^"'`]+)\1/g, (_, quote, path) =>
      asset(path),
    )
    .replace(
      /`\.\.\/assets\/ending-one\/route\/player_bus_\$\{d\}\.webp`/g,
      () =>
        `({${["n", "e", "s", "w"].map((d) => `${d}:${asset(`../assets/ending-one/route/player_bus_${d}.webp`)}`).join(",")}})[d]`,
    );
  return imports.join("\n") + "\n" + result;
}
