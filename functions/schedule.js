import { renderListingPage } from "./_shared/listing-page.js";

export function onRequestGet(context) {
  return renderListingPage(context, "schedule");
}

export function onRequestHead(context) {
  return renderListingPage(context, "schedule");
}
