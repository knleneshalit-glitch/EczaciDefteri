"use server";

import { confirmReceiptAction, bulkRemoveFromShipmentAction } from "@/app/actions/shipments";

/** Form butonları için sonuç döndürmeyen sarmalayıcılar. */
export async function confirmReceiptFormAction(shipmentIds: string[]) {
  await confirmReceiptAction(shipmentIds);
}

export async function removeFromShipmentFormAction(offerIds: string[]) {
  await bulkRemoveFromShipmentAction(offerIds);
}
