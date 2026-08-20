import { renderBoxerPage } from "../_shared/boxer-page.js";

export function onRequestGet(context) {
  return renderBoxerPage(context);
}

export function onRequestHead(context) {
  return renderBoxerPage(context);
}
