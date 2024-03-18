export class Deferred<T> {
  public resolve: (value: T | PromiseLike<T>) => void;
  public reject: (error: unknown) => void;
  public promise: Promise<T>;

  constructor() {
    // The Promise constructor will re-set these before they can be observed,
    // and so they can never be called.  Typescript doesn't know that though, so
    // assign throw-away functions. These throw errors in case something goes
    // wrong in the future.
    this.resolve = () => {
      throw new Error("Deferred.resolve() called before it was set up");
    };
    this.reject = () => {
      throw new Error("Deferred.reject() called before it was set up");
    };

    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}
