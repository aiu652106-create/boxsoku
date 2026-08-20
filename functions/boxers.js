import { renderBoxersPage } from "./_shared/boxer-page.js";

export function onRequestGet(context) {
  return renderBoxersPage(context);
}

export function onRequestHead(context) {
  return renderBoxersPage(context);
}
