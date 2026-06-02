/**
 * Hardware module barrel export.
 *
 * One-stop import:  import { printer, drawer, scanner, scale, cardReader } from "@/lib/hardware"
 */

export { printer, ESC_POS } from "./printer";
export { drawer } from "./drawer";
export { scanner } from "./scanner";
export { scale } from "./scale";
export { cardReader, EMV_TAGS, TXN_TYPES, ENTRY_MODES } from "./cardReader";
