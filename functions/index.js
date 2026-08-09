import { renderListingPage } from "./_shared/listing-page.js";

export function onRequestGet(context) {
  return renderListingPage(context, "home");
}

export function onRequestHead(context) {
  return renderListingPage(context, "home");
}
