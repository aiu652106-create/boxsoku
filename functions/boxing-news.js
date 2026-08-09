import { renderListingPage } from "./_shared/listing-page.js";

export function onRequestGet(context) {
  return renderListingPage(context, "news");
}

export function onRequestHead(context) {
  return renderListingPage(context, "news");
}
