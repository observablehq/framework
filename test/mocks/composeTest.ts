export type TestFixture<FIn extends BaseFixtures = BaseFixtures, FOut extends BaseFixtures = BaseFixtures> = (
  fn: TestFunction<FIn>
) => TestFunction<FOut>;

type TestFunction<F extends BaseFixtures = BaseFixtures> = (a: F) => void | Promise<void>;

export type BaseFixtures = Record<string, never>;

// This next function takes an arbitrarily long list of fixtures followed by a
// test. Typescript won't allow chaining the types of the fixtures arbitrarily
// long, so instead we define specific instances of the type.
//
// The type that we are emulating is something like this
//
//   type FixtureChain<In, Out> = [Fixture<In, Mid>, ...FixtureChain<Mid, Out>];
//
//   function composeTest<F>(
//     name: string,
//     ...fixtures: FixtureChain<BaseFixtures, F>,
//     test: TestFunction<F>
//   ): Mocha.Test;
//
// This doesn't work because FixtureChain cannot recursively reference itself,
// and also because `...args` can only be used as the last argument to a
// function.
//
// So instead we define a fixed set of overloads for the function up to an
// arbitrary length. If you find yourself needing more fixtures than allowed
// here, just add another overload.

/**
 * Build a test function by composing a series of fixtures and a test.
 *
 * Currently implemented for up to 4 fixtures, though this can be extended
 * arbitrarily.
 */
function composeTestIt(name: string, test: TestFunction<BaseFixtures>): Mocha.Test;
function composeTestIt<A extends BaseFixtures>(
  name: string,
  a: TestFixture<BaseFixtures, A>,
  test: TestFunction<A>
): Mocha.Test;
function composeTestIt<A extends BaseFixtures, B extends BaseFixtures>(
  name: string,
  a: TestFixture<BaseFixtures, A>,
  ab: TestFixture<A, B>,
  test: TestFunction<B>
): Mocha.Test;
function composeTestIt<A extends BaseFixtures, B extends BaseFixtures, C extends BaseFixtures>(
  name: string,
  a: TestFixture<BaseFixtures, A>,
  ab: TestFixture<A, B>,
  bc: TestFixture<B, C>,
  test: TestFunction<C>
): Mocha.Test;
function composeTestIt<A extends BaseFixtures, B extends BaseFixtures, C extends BaseFixtures, D extends BaseFixtures>(
  name: string,
  a: TestFixture<BaseFixtures, A>,
  ab: TestFixture<A, B>,
  bc: TestFixture<B, C>,
  cd: TestFixture<C, D>,
  test: TestFunction<D>
): Mocha.Test;
function composeTestIt(name: string, ...args: (TestFunction | TestFixture | never)[]): Mocha.Test {
  return composeTestInner(name, it, args);
}

type ExportType = typeof composeTestIt & {only: typeof composeTestIt; skip: typeof composeTestIt};

export const composeTest: ExportType = Object.assign(composeTestIt, {
  skip: (name, ...args) => composeTestInner(name, it.skip, args) as unknown as typeof composeTestIt,
  only: (name, ...args) => composeTestInner(name, it.only, args) as unknown as typeof composeTestIt
}) as unknown as ExportType;

function composeTestInner(
  name: string,
  testFn: Mocha.TestFunction | Mocha.PendingTestFunction,
  args: (TestFunction | TestFixture)[]
): Mocha.Test {
  const composed = composeAll(...args);
  return testFn(name, async () => {
    await composed({});
  });
}

function composeAll(...args: ((a: any) => any)[]): (a: any) => any {
  const funcs = [...args];
  let decorated = funcs.pop();
  if (!decorated) {
    throw new Error("At least one function must be passed");
  }
  const originalName = decorated.name;
  funcs.reverse();
  for (const func of funcs) {
    if (!func) continue;
    decorated = func(decorated);
  }
  if (!decorated) throw new Error("One of the compose functions didn't return properly");
  Object.defineProperty(decorated, "name", {value: originalName});
  return decorated;
}
