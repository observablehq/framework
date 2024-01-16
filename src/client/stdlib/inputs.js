import {fileOf} from "@observablehq/inputs";
import {AbstractFile} from "npm:@observablehq/stdlib";

export * from "@observablehq/inputs";
export const file = fileOf(AbstractFile);
