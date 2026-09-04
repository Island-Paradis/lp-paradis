import { getPayload } from "payload";
import config from "@payload-config";
import type { BasePayload } from "payload";

let payloadInstance: BasePayload | null = null;

async function getPayloadInstance(): Promise<BasePayload> {
  if (!payloadInstance) {
    payloadInstance = await getPayload({ config });
  }
  return payloadInstance;
}


export { getPayloadInstance };