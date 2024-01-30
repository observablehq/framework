import type * as clack from "@clack/prompts";

export interface ClackEffects {
  text: (typeof clack)["text"];
  intro: (typeof clack)["intro"];
  select: (typeof clack)["select"];
  confirm: (typeof clack)["confirm"];
  spinner: (typeof clack)["spinner"];
  note: (typeof clack)["note"];
  outro: (typeof clack)["outro"];
  cancel: (typeof clack)["cancel"];
  group<T>(prompts: clack.PromptGroup<T>, options?: clack.PromptGroupOptions<T>): Promise<unknown>;
}
