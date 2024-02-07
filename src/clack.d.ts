import type * as clack from "@clack/prompts";

type Clack = typeof clack;

export interface ClackEffects {
  text: Clack["text"];
  intro: Clack["intro"];
  select: Clack["select"];
  confirm: Clack["confirm"];
  spinner: Clack["spinner"];
  note: Clack["note"];
  outro: Clack["outro"];
  cancel: Clack["cancel"];
  group<T>(prompts: clack.PromptGroup<T>, options?: clack.PromptGroupOptions<T>): Promise<unknown>;
  log: Clack["log"];
  isCancel: Clack["isCancel"];
}
