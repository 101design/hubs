import { objectTypeForOriginAndContentType } from "../object-types";
import { getReticulumFetchUrl } from "./phoenix-utils";
const mediaAPIEndpoint = getReticulumFetchUrl("/api/v1/media");

const fetchContentType = async url => {
  return fetch(url, { method: "HEAD" }).then(r => r.headers.get("content-type"));
};

const contentIndexCache = new Map();
export const fetchMaxContentIndex = async (documentUrl, pageUrl) => {
  if (contentIndexCache.has(documentUrl)) return contentIndexCache.get(documentUrl);
  const maxIndex = await fetch(pageUrl).then(r => parseInt(r.headers.get("x-max-content-index")));
  contentIndexCache.set(documentUrl, maxIndex);
  return maxIndex;
};

const resolveMediaCache = new Map();
export const resolveMedia = async (url, skipContentType, index) => {
  const parsedUrl = new URL(url);
  const cacheKey = `${url}|${index}`;
  if (resolveMediaCache.has(cacheKey)) return resolveMediaCache.get(cacheKey);

  const isHttpOrHttps = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  const resolved = !isHttpOrHttps
    ? { raw: url, origin: url }
    : await fetch(mediaAPIEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media: { url, index } })
      }).then(r => r.json());

  if (isHttpOrHttps && !skipContentType) {
    const contentType =
      (resolved.meta && resolved.meta.expected_content_type) || (await fetchContentType(resolved.raw));
    resolved.contentType = contentType;
  }

  resolveMediaCache.set(cacheKey, resolved);
  return resolved;
};

export const upload = file => {
  const formData = new FormData();
  formData.append("media", file);
  return fetch(mediaAPIEndpoint, {
    method: "POST",
    body: formData
  }).then(r => r.json());
};

// https://stackoverflow.com/questions/7584794/accessing-jpeg-exif-rotation-data-in-javascript-on-the-client-side/32490603#32490603
function getOrientation(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const view = new DataView(e.target.result);
    if (view.getUint16(0, false) != 0xffd8) {
      return callback(-2);
    }
    const length = view.byteLength;
    let offset = 2;
    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) return callback(-1);
      const marker = view.getUint16(offset, false);
      offset += 2;
      if (marker == 0xffe1) {
        if (view.getUint32((offset += 2), false) != 0x45786966) {
          return callback(-1);
        }

        const little = view.getUint16((offset += 6), false) == 0x4949;
        offset += view.getUint32(offset + 4, little);
        const tags = view.getUint16(offset, little);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) == 0x0112) {
            return callback(view.getUint16(offset + i * 12 + 8, little));
          }
        }
      } else if ((marker & 0xff00) != 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
    return callback(-1);
  };
  reader.readAsArrayBuffer(file);
}

let interactableId = 0;
export const addMedia = (src, contentOrigin, resize = false) => {
  const scene = AFRAME.scenes[0];

  const entity = document.createElement("a-entity");
  entity.id = "interactable-media-" + interactableId++;
  entity.setAttribute("networked", { template: "#interactable-media" });
  entity.setAttribute("media-loader", { resize, src: typeof src === "string" ? src : "" });
  scene.appendChild(entity);

  const orientation = new Promise(function(resolve) {
    if (src instanceof File) {
      getOrientation(src, x => {
        resolve(x);
      });
    } else {
      resolve(1);
    }
  });
  if (src instanceof File) {
    upload(src)
      .then(response => {
        const srcUrl = new URL(response.raw);
        srcUrl.searchParams.set("token", response.meta.access_token);
        entity.setAttribute("media-loader", { src: srcUrl.href });
      })
      .catch(() => {
        entity.setAttribute("media-loader", { src: "error" });
      });
  }

  entity.addEventListener("media_resolved", ({ detail }) => {
    const objectType = objectTypeForOriginAndContentType(contentOrigin, detail.contentType);
    scene.emit("object_spawned", { objectType });
  });

  return { entity, orientation };
};
